// lib/main.dart
import 'dart:async';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:receive_sharing_intent/receive_sharing_intent.dart';
import 'package:pdfx/pdfx.dart'; // Renders PDF pages to images
import 'package:image/image.dart' as img; // Processes images for pixel data

void main() {
  runApp(const PrintBridgeApp());
}

class PrintBridgeApp extends StatelessWidget {
  const PrintBridgeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Thermal Print Bridge',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      home: const PrintBridgeHome(),
    );
  }
}

class PrintBridgeHome extends StatefulWidget {
  const PrintBridgeHome({super.key});

  @override
  State<PrintBridgeHome> createState() => _PrintBridgeHomeState();
}

class _PrintBridgeHomeState extends State<PrintBridgeHome> {
  late StreamSubscription _intentDataStreamSubscription;
  List<SharedMediaFile> _sharedFiles = [];
  BluetoothDevice? _connectedPrinter;
  BluetoothCharacteristic? _writeCharacteristic;
  bool _isScanning = false;
  bool _isPrinting = false;
  List<BluetoothDevice> _scanResults = [];
  String _statusMessage = "Menunggu file PDF dibagikan...";

  // Konfigurasi Printer (default 58mm = 384 dots, 80mm = 576 dots)
  final int _paperWidthDots = 384; 
  final int _feedLines = 3;
  final int _chunkSize = 128; // Maksimal bytes per packet BLE

  @override
  void initState() {
    super.initState();

    // 1. Mendengarkan file PDF yang di-share saat aplikasi berada di background/memory
    _intentDataStreamSubscription = ReceiveSharingIntent.instance.getMediaStream().listen((value) {
      setState(() {
        _sharedFiles = value;
      });
      _handleSharedFiles(value);
    }, onError: (err) {
      _updateStatus("Gagal menerima file share: $err");
    });

    // 2. Mendengarkan file PDF yang di-share saat aplikasi pertama kali dibuka (cold start)
    ReceiveSharingIntent.instance.getInitialMedia().then((value) {
      setState(() {
        _sharedFiles = value;
      });
      _handleSharedFiles(value);
    });

    // Mulai scan printer bluetooth otomatis
    _startBluetoothScanAndAutoConnect();
  }

  @override
  void dispose() {
    _intentDataStreamSubscription.cancel();
    super.dispose();
  }

  void _updateStatus(String msg) {
    setState(() {
      _statusMessage = msg;
    });
    debugPrint("[PrintBridge] $msg");
  }

  // Handle file PDF yang masuk dari fitur Share Android
  void _handleSharedFiles(List<SharedMediaFile> files) {
    if (files.isEmpty) return;
    
    final pdfFile = files.firstWhere(
      (file) => file.path.toLowerCase().endsWith('.pdf'),
      orElse: () => files.first,
    );

    _updateStatus("File PDF diterima: ${pdfFile.path.split('/').last}");
    _processAndPrintPdf(pdfFile.path);
  }

  // Scan dan otomatis hubungkan ke printer thermal terdekat
  Future<void> _startBluetoothScanAndAutoConnect() async {
    if (await FlutterBluePlus.isSupported == false) {
      _updateStatus("Bluetooth tidak didukung di perangkat ini.");
      return;
    }

    // Tunggu bluetooth menyala
    FlutterBluePlus.adapterState.listen((BluetoothAdapterState state) async {
      if (state == BluetoothAdapterState.on) {
        _performScan();
      } else {
        _updateStatus("Mohon aktifkan Bluetooth Anda.");
      }
    });
  }

  Future<void> _performScan() async {
    setState(() {
      _isScanning = true;
      _scanResults.clear();
    });
    _updateStatus("Mencari printer Bluetooth...");

    try {
      await FlutterBluePlus.startScan(timeout: const Duration(seconds: 4));
      
      FlutterBluePlus.scanResults.listen((results) {
        for (ScanResult r in results) {
          if (r.device.platformName.isNotEmpty && !_scanResults.contains(r.device)) {
            setState(() {
              _scanResults.add(r.device);
            });
            // Auto-connect ke printer jika nama mengandung kata kunci printer/thermal
            final name = r.device.platformName.toLowerCase();
            if (name.contains('printer') || name.contains('thermal') || name.contains('spp') || name.contains('mpt') || name.contains('pos')) {
              FlutterBluePlus.stopScan();
              _connectToPrinter(r.device);
              break;
            }
          }
        }
      });
    } catch (e) {
      _updateStatus("Error scanning: $e");
    } finally {
      Future.delayed(const Duration(seconds: 4), () {
        setState(() {
          _isScanning = false;
        });
      });
    }
  }

  Future<void> _connectToPrinter(BluetoothDevice device) async {
    _updateStatus("Menghubungkan ke ${device.platformName}...");
    try {
      await device.connect();
      _connectedPrinter = device;
      
      // Temukan service dan write characteristic untuk printer ESC/POS
      List<BluetoothService> services = await device.discoverServices();
      for (var service in services) {
        for (var char in service.characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            _writeCharacteristic = char;
            break;
          }
        }
      }

      if (_writeCharacteristic != null) {
        _updateStatus("Terhubung ke ${device.platformName} dan Siap Mencetak!");
        if (_sharedFiles.isNotEmpty) {
          _handleSharedFiles(_sharedFiles);
        }
      } else {
        _updateStatus("Printer terhubung, tapi write characteristic tidak ditemukan.");
      }
    } catch (e) {
      _updateStatus("Gagal terhubung ke printer: $e");
    }
  }

  // ALGORITMA UTAMA: Konversi halaman PDF menjadi ESC/POS Monochrome Raster
  Future<void> _processAndPrintPdf(String filePath) async {
    if (_writeCharacteristic == null) {
      _updateStatus("Printer belum terhubung! Silakan hubungkan printer dahulu.");
      return;
    }

    if (_isPrinting) return;

    setState(() {
      _isPrinting = true;
    });

    try {
      _updateStatus("Membuka file PDF...");
      final document = await PdfDocument.openFile(filePath);
      
      _updateStatus("Menerjemahkan PDF ke ESC/POS...");
      List<int> printBuffer = [];

      // Kirim inisialisasi printer ESC/POS: ESC @ (Initialize printer)
      printBuffer.addAll([0x1B, 0x40]);

      for (int i = 1; i <= document.pagesCount; i++) {
        _updateStatus("Merender Halaman $i dari ${document.pagesCount}...");
        final page = await document.getPage(i);
        
        final pageRender = await page.render(
          width: _paperWidthDots,
          height: (_paperWidthDots * (page.height / page.width)).toInt(),
          format: PdfPageImageFormat.png,
        );

        if (pageRender != null) {
          img.Image? originalImage = img.decodePng(pageRender.bytes);
          if (originalImage != null) {
            List<int> rasterBytes = _convertToEscPosRaster(originalImage, _paperWidthDots);
            printBuffer.addAll(rasterBytes);
          }
        }
        await page.close();
      }

      // Berikan jarak baris pengumpan kertas (Paper Feed) di akhir cetakan
      for (int f = 0; f < _feedLines; f++) {
        printBuffer.add(0x0A); // ASCII LF (Line Feed)
      }

      _updateStatus("Mengirim data cetak ke printer...");
      await _sendDataInChunks(printBuffer);
      _updateStatus("Cetak PDF selesai!");
    } catch (e) {
      _updateStatus("Gagal memproses PDF: $e");
    } finally {
      setState(() {
        _isPrinting = false;
      });
    }
  }

  // Mengubah Gambar ke ESC/POS Raster format (Command: GS v 0 m xL xH yL yH d1...dk)
  List<int> _convertToEscPosRaster(img.Image image, int targetWidth) {
    List<int> bytes = [];
    
    int width = (targetWidth / 8).floor() * 8;
    int height = image.height;

    int xBytes = (width / 8).floor();
    int xL = xBytes % 256;
    int xH = (xBytes / 256).floor();
    int yL = height % 256;
    int yH = (height / 256).floor();

    bytes.addAll([0x1D, 0x61, 0x00]); // Batalkan perataan tengah sementara
    bytes.addAll([0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH]);

    for (int y = 0; y < height; y++) {
      for (int x = 0; x < xBytes; x++) {
        int slice = 0;
        for (int b = 0; b < 8; b++) {
          int pixelX = (x * 8) + b;
          if (pixelX < width) {
            var pixel = image.getPixel(pixelX, y);
            double luminance = (pixel.r * 0.299 + pixel.g * 0.587 + pixel.b * 0.114);
            if (luminance < 128) { // Thresholding: jika gelap tandai sebagai bit hitam (1)
              slice |= (0x80 >> b);
            }
          }
        }
        bytes.add(slice);
      }
    }
    return bytes;
  }

  // Mengirim data bluetooth dengan chunking agar tidak kelebihan kapasitas buffer printer
  Future<void> _sendDataInChunks(List<int> bytes) async {
    if (_writeCharacteristic == null) return;

    final int totalLength = bytes.length;
    
    for (int i = 0; i < totalLength; i += _chunkSize) {
      int end = (i + _chunkSize < totalLength) ? i + _chunkSize : totalLength;
      List<int> chunk = bytes.sublist(i, end);
      
      try {
        await _writeCharacteristic!.write(Uint8List.fromList(chunk), withoutResponse: true);
        await Future.delayed(const Duration(milliseconds: 15));
      } catch (e) {
        debugPrint("Gagal menulis chunk ke Bluetooth: $e");
        break;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Thermal Print Bridge'),
        backgroundColor: Colors.blue[800],
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              color: Colors.blue[50],
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    const Icon(Icons.print_outlined, size: 48, color: Colors.blue),
                    const SizedBox(height: 8),
                    Text(
                      _statusMessage,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    if (_isPrinting)
                      const Padding(
                        padding: EdgeInsets.only(top: 12.0),
                        child: LinearProgressIndicator(),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.between,
              children: [
                Text(
                  _connectedPrinter != null 
                    ? "Printer: ${_connectedPrinter!.platformName}" 
                    : "Printer: Belum Terhubung",
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: _connectedPrinter != null ? Colors.green : Colors.red,
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: _isScanning ? null : _performScan,
                  icon: _isScanning 
                    ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.search),
                  label: Text(_isScanning ? "Scanning..." : "Scan Printer"),
                )
              ],
            ),
            const SizedBox(height: 8),
            Expanded(
              child: _scanResults.isEmpty
                ? Center(
                    child: Text(
                      "Tidak ada bluetooth printer ditemukan.\nPastikan Bluetooth printer menyala.",
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  )
                : ListView.builder(
                    itemCount: _scanResults.length,
                    itemBuilder: (context, index) {
                      final device = _scanResults[index];
                      final isConnected = _connectedPrinter?.remoteId == device.remoteId;
                      return ListTile(
                        leading: const Icon(Icons.bluetooth),
                        title: Text(device.platformName.isNotEmpty ? device.platformName : "Perangkat Tanpa Nama"),
                        subtitle: Text(device.remoteId.toString()),
                        trailing: isConnected
                          ? const Icon(Icons.check_circle, color: Colors.green)
                          : const Icon(Icons.chevron_right),
                        onTap: isConnected ? null : () => _connectToPrinter(device),
                      );
                    },
                  ),
            ),
            if (_sharedFiles.isNotEmpty)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.green[200]!),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.file_present, color: Colors.green),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        "File mengantre: ${_sharedFiles.first.path.split('/').last}",
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.print, color: Colors.green),
                      onPressed: () => _processAndPrintPdf(_sharedFiles.first.path),
                    )
                  ],
                ),
              )
          ],
        ),
      ),
    );
  }
}
