import React, { useState, useEffect, useRef } from "react";
import { 
  Printer, 
  Share2, 
  FileText, 
  CheckCircle, 
  RefreshCw, 
  Sliders, 
  Code, 
  Smartphone, 
  Settings, 
  Terminal, 
  Info, 
  AlertCircle, 
  Copy, 
  ExternalLink, 
  Check,
  ChevronRight,
  Upload,
  Play,
  Flame,
  Search,
  WifiOff
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Types for Simulator
interface Device {
  id: string;
  name: string;
  type: string;
  rssi: number;
  connected: boolean;
}

interface LogEntry {
  timestamp: string;
  type: "info" | "success" | "error" | "warn";
  message: string;
}

interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
}

export default function App() {
  // Configuration States
  const [packageName, setPackageName] = useState("com.example.print_bridge");
  const [paperWidth, setPaperWidth] = useState<"58mm" | "80mm">("58mm");
  const [autoConnect, setAutoConnect] = useState(true);
  const [feedLines, setFeedLines] = useState(3);
  const [chunkSize, setChunkSize] = useState(128); // Bytes per chunk for stable BLE
  const [pdfRenderingDpi, setPdfRenderingDpi] = useState(200);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"code" | "manifest" | "pubspec" | "guide">("code");
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  // Simulator States
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([
    { id: "00:11:22:33:44:55", name: "Thermal Printer 58mm", type: "ESC/POS", rssi: -54, connected: false },
    { id: "88:0F:10:2E:BC:99", name: "RPP02N (Portable 80mm)", type: "ESC/POS (80mm)", rssi: -72, connected: false },
    { id: "AA:BB:CC:DD:EE:FF", name: "SPP-R200 III", type: "Bixolon Custom", rssi: -88, connected: false }
  ]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [sharedPdf, setSharedPdf] = useState<{ name: string; size: string; content: string } | null>({
    name: "invoice_2026_0045.pdf",
    size: "245 KB",
    content: "retail_invoice"
  });
  const [simulatingShare, setSimulatingShare] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printLogs, setPrintLogs] = useState<LogEntry[]>([
    { timestamp: "10:15:20", type: "info", message: "Print Bridge Service initialized." },
    { timestamp: "10:15:21", type: "info", message: "Listening for incoming shared PDF intents..." }
  ]);
  const [printedReceipts, setPrintedReceipts] = useState<Array<{ id: string; timestamp: string; title: string; content: React.ReactNode; width: "58mm" | "80mm" }>>([]);

  const receiptEndRef = useRef<HTMLDivElement>(null);

  // Auto Scroll logs & simulated prints
  useEffect(() => {
    if (receiptEndRef.current) {
      receiptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [printedReceipts, printLogs]);

  const addLog = (message: string, type: "info" | "success" | "error" | "warn" = "info") => {
    const time = new Date().toLocaleTimeString();
    setPrintLogs(prev => [...prev, { timestamp: time, type, message }]);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  // Simulate scanning for Bluetooth devices
  const startScan = () => {
    setScanning(true);
    addLog("Scanning for BLE ESC/POS Thermal Printers...", "info");
    setTimeout(() => {
      setScanning(false);
      addLog("Scan completed. Found 3 nearby thermal printers.", "success");
    }, 1500);
  };

  // Connect printer
  const connectPrinter = (device: Device) => {
    addLog(`Connecting to ${device.name} [${device.id}]...`, "info");
    setTimeout(() => {
      setDevices(prev => prev.map(d => d.id === device.id ? { ...d, connected: true } : { ...d, connected: false }));
      const updated = { ...device, connected: true };
      setConnectedDevice(updated);
      addLog(`Connected to ${device.name} successfully! MTU negotiated: 512 bytes.`, "success");
    }, 1000);
  };

  const disconnectPrinter = () => {
    if (connectedDevice) {
      addLog(`Disconnecting from ${connectedDevice.name}...`, "warn");
      setDevices(prev => prev.map(d => ({ ...d, connected: false })));
      setConnectedDevice(null);
      addLog("Bluetooth connection terminated.", "info");
    }
  };

  // Simulate Android PDF Intent Share
  const triggerShareSimulation = (template: string) => {
    setSimulatingShare(true);
    let name = "receipt.pdf";
    let size = "112 KB";
    if (template === "retail_invoice") { name = "invoice_majujaya_882.pdf"; size = "142 KB"; }
    else if (template === "event_ticket") { name = "ticket_dino_weekend.pdf"; size = "312 KB"; }
    else if (template === "shipping_label") { name = "shipping_resi_klx99.pdf"; size = "98 KB"; }

    setSharedPdf({ name, size, content: template });
    addLog(`Android system triggered SEND intent with MimeType 'application/pdf'`, "info");
    addLog(`Incoming shared file received: ${name} (${size})`, "success");
    
    setTimeout(() => {
      setSimulatingShare(false);
      addLog("PDF shared data loaded into Flutter memory buffer.", "success");
      if (autoConnect && !connectedDevice) {
        addLog("Auto-connect is enabled. Finding default printer...", "info");
        const defaultPrinter = devices[0];
        connectPrinter(defaultPrinter);
      }
    }, 1200);
  };

  // Simulate Printing process
  const startPrintSim = () => {
    if (!sharedPdf) {
      addLog("No PDF file shared. Please share a PDF file first.", "error");
      return;
    }
    if (!connectedDevice) {
      addLog("Printer not connected! Please connect to a Bluetooth printer first.", "error");
      return;
    }

    setPrinting(true);
    addLog(`Initializing PDF translation for ${paperWidth} layout...`, "info");
    addLog(`[Step 1] Loading PDF from shared binary stream`, "info");

    setTimeout(() => {
      addLog(`[Step 2] Rendering PDF vector pages into high-resolution monochrome bitmap @ ${pdfRenderingDpi} DPI`, "info");
      
      setTimeout(() => {
        addLog(`[Step 3] Applying Floyd-Steinberg dithering for pure black & white pixels`, "info");
        const widthDots = paperWidth === "58mm" ? 384 : 576;
        addLog(`[Step 4] Converting bitmap to ESC/POS Command: GS v 0 m (Normal Raster Mode)`, "info");
        addLog(`Image dimensions: ${widthDots}px width, raster size: ${Math.round(widthDots * 1.4)}px height`, "info");

        setTimeout(() => {
          addLog(`[Step 5] Compiling print buffer (Total size: ${paperWidth === "58mm" ? "4.2 KB" : "7.1 KB"} of raw commands)`, "info");
          addLog(`[Step 6] Splitting bytes into ${chunkSize}-byte chunks for BLE transmission stability`, "info");
          
          let chunkCount = Math.ceil((paperWidth === "58mm" ? 4300 : 7200) / chunkSize);
          addLog(`Sending ${chunkCount} packets sequentially to characteristic UUID BEF8D121-6A79-11E2-B92D-0800200C9A66`, "info");

          setTimeout(() => {
            // Generate receipt HTML
            const receiptId = Math.random().toString(36).substr(2, 9);
            const receiptContent = renderReceiptMarkup(sharedPdf.content);
            setPrintedReceipts(prev => [...prev, {
              id: receiptId,
              timestamp: new Date().toLocaleTimeString(),
              title: sharedPdf.name,
              content: receiptContent,
              width: paperWidth
            }]);

            addLog(`Bytes sent successfully. Adding ${feedLines} empty line feeds...`, "success");
            addLog(`Print job completed for ${sharedPdf.name}!`, "success");
            setPrinting(false);
          }, 1500);
        }, 1000);
      }, 1000);
    }, 1000);
  };

  // Render simulated receipt based on shared content
  const renderReceiptMarkup = (content: string) => {
    const is80 = paperWidth === "80mm";
    if (content === "retail_invoice") {
      return (
        <div className="text-black font-mono text-[11px] leading-tight select-none">
          <div className="text-center font-bold text-sm tracking-wide border-b border-dashed border-gray-400 pb-2 mb-2">
            TOKO MAJU JAYA<br/>
            <span className="text-[10px] font-normal">Jl. Raya Tekno No. 102, Jakarta</span>
          </div>
          <div className="flex justify-between text-[10px] mb-2">
            <span>Tgl: {new Date().toLocaleDateString()}</span>
            <span>No: INV-2026-9901</span>
          </div>
          <div className="border-b border-dashed border-gray-400 pb-1 mb-1">
            <div className="flex justify-between font-bold">
              <span>Item</span>
              <span>Total</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>2x Beras Premium 5kg</span>
              <span>Rp 70.000</span>
            </div>
            <div className="flex justify-between">
              <span>1x Minyak Goreng 2L</span>
              <span>Rp 28.000</span>
            </div>
            <div className="flex justify-between">
              <span>3x Mie Instan Rasa Soto</span>
              <span>Rp  9.000</span>
            </div>
          </div>
          <div className="flex justify-between font-bold text-[12px] border-b border-dashed border-gray-400 pb-2 mb-2">
            <span>TOTAL:</span>
            <span>Rp 107.000</span>
          </div>
          <div className="text-center text-[10px] italic space-y-1">
            <p>Terima kasih atas kunjungan Anda!</p>
            <p>Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan.</p>
          </div>
          {is80 && (
            <div className="mt-4 border-t border-dashed border-gray-400 pt-2 text-center text-[9px] text-gray-500">
              * Powered by Flutter Thermal Print Bridge *<br/>
              Simulated 80mm Wide Printout Format
            </div>
          )}
        </div>
      );
    } else if (content === "event_ticket") {
      return (
        <div className="text-black font-mono text-[11px] leading-tight select-none">
          <div className="text-center font-bold text-sm border-b-2 border-double border-gray-500 pb-2 mb-2">
            ▲ DINO LAND PARK ▲<br/>
            <span className="text-[10px] font-semibold tracking-widest">WEEKEND ENTRY PASS</span>
          </div>
          <div className="space-y-1 mb-3">
            <div className="flex justify-between">
              <span>Ticket ID:</span>
              <span className="font-bold">DL-88293-2026</span>
            </div>
            <div className="flex justify-between">
              <span>Tipe Tiket:</span>
              <span>Dewasa (Adult)</span>
            </div>
            <div className="flex justify-between">
              <span>Waktu Kunjungan:</span>
              <span>Sabtu / Minggu</span>
            </div>
            <div className="flex justify-between">
              <span>Harga:</span>
              <span>Rp 150.000</span>
            </div>
          </div>
          
          <div className="my-4 flex flex-col items-center justify-center border border-gray-400 p-2 bg-white">
            {/* Mock QR Code Pattern */}
            <div className="grid grid-cols-8 gap-0.5 w-16 h-16 bg-black p-1">
              {[...Array(64)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-full h-full ${
                    (i % 3 === 0 || i % 7 === 0 || (i > 15 && i < 24) || i % 11 === 0 || i === 0 || i === 7 || i === 56 || i === 63) 
                      ? 'bg-white' 
                      : 'bg-black'
                  }`}
                />
              ))}
            </div>
            <span className="text-[8px] mt-1 text-gray-600">SCAN AT GATE</span>
          </div>

          <div className="text-center text-[9px] border-t border-dashed border-gray-400 pt-2 italic">
            Harap jaga tiket fisik ini.<br/>
            No Refund - No Exchange.
          </div>
        </div>
      );
    } else {
      return (
        <div className="text-black font-mono text-[11px] leading-tight select-none">
          <div className="text-center font-bold text-sm pb-1 mb-1">
            KILAT LOGISTICS
          </div>
          <div className="text-center font-semibold text-[10px] border-b border-gray-400 pb-2 mb-2">
            RESI: KLX-900823912
          </div>
          <div className="space-y-1.5 mb-3">
            <div>
              <span className="font-bold text-[10px]">PENGIRIM:</span>
              <div className="pl-2 text-[10px]">Toko Hijau (Surabaya)</div>
            </div>
            <div>
              <span className="font-bold text-[10px]">PENERIMA:</span>
              <div className="pl-2 text-[10px]">Budi Santoso<br/>Jl. Mawar Merah No. 4A, Kebon Jeruk, Jakarta Barat</div>
            </div>
            <div className="flex justify-between border-t border-gray-300 pt-1.5">
              <span>Berat: 1.5 Kg</span>
              <span>Layanan: REGULER</span>
            </div>
          </div>
          
          <div className="flex flex-col items-center py-2 border-t border-b border-dashed border-gray-400">
            {/* Mock Barcode */}
            <div className="flex items-center space-x-0.5 h-8 bg-black w-32 justify-center">
              {[1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 1, 3, 1, 2, 4, 1].map((w, idx) => (
                <div key={idx} className="h-full bg-white" style={{ width: `${w * 1.5}px` }} />
              ))}
            </div>
            <span className="text-[8px] mt-1">*KLX-900823912*</span>
          </div>
          
          <div className="text-center text-[9px] mt-2 text-gray-600">
            Printed via PDF Android Share Bridge
          </div>
        </div>
      );
    }
  };

  // Source codes generated based on configs
  const mainDartCode = `// lib/main.dart
// Generated for Print Bridge: ${packageName}
// Paper Width: ${paperWidth} (${paperWidth === "58mm" ? "384 dots" : "576 dots"}), Feed: ${feedLines} lines
// Uses flutter_blue_plus and receive_sharing_intent for seamless PDF redirection.

import 'dart:async';
import 'dart:io';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
      theme: ThemeData(
        primarySwatch: Colors.blue,
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

    // Mulai scan printer bluetooth otomatis jika dikonfigurasi
    if (${autoConnect}) {
      _startBluetoothScanAndAutoConnect();
    }
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

    _updateStatus("File PDF diterima: \${pdfFile.path.split('/').last}");
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
            // Auto connect ke printer jika nama mengandung kata printer/thermal
            final name = r.device.platformName.toLowerCase();
            if (${autoConnect} && (name.contains('printer') || name.contains('thermal') || name.contains('spp') || name.contains('mpt'))) {
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
    _updateStatus("Menghubungkan ke \${device.platformName}...");
    try {
      await device.connect();
      _connectedPrinter = device;
      
      // Temukan service dan write characteristic untuk printer ESC/POS
      List<BluetoothService> services = await device.discoverServices();
      for (var service in services) {
        for (var char in service.characteristics) {
          // Cari characteristic yang mendukung penulisan tanpa response atau dengan write
          if (char.properties.write || char.properties.writeWithoutResponse) {
            _writeCharacteristic = char;
            break;
          }
        }
      }

      if (_writeCharacteristic != null) {
        _updateStatus("Terhubung ke \${device.platformName} dan Siap Mencetak!");
        // Jika ada antrean file shared, langsung cetak
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
        _updateStatus("Merender Halaman \$i dari \${document.pagesCount}...");
        final page = await document.getPage(i);
        
        // Render halaman PDF ke gambar PNG sementara
        // Sesuaikan lebar dots berdasarkan target kertas (58mm = 384 dots, 80mm = 576 dots)
        final targetWidth = ${paperWidth === "58mm" ? 384 : 576};
        
        // Mempertahankan rasio aspek halaman PDF
        final pageRender = await page.render(
          width: targetWidth,
          height: (targetWidth * (page.height / page.width)).toInt(),
          format: PdfPageImageFormat.png,
        );

        if (pageRender != null) {
          // Decode gambar menggunakan library 'image'
          img.Image? originalImage = img.decodePng(pageRender.bytes);
          if (originalImage != null) {
            // Konversi gambar ke monochrome raster bitmap (ESC/POS command: GS v 0)
            List<int> rasterBytes = _convertToEscPosRaster(originalImage, targetWidth);
            printBuffer.addAll(rasterBytes);
          }
        }
        await page.close();
      }

      // Berikan jarak baris pengumpan kertas (Paper Feed) di akhir cetakan
      for (int f = 0; f < ${feedLines}; f++) {
        printBuffer.add(0x0A); // ASCII LF (Line Feed)
      }
      
      // Kirim perintah potong kertas (Paper Cut) jika printer 80mm mendukung cutter otomatis
      if ("${paperWidth}" == "80mm") {
        printBuffer.addAll([0x1D, 0x56, 0x41, 0x03]); // GS V 65 3 (Cut paper)
      }

      // Kirim data buffer ke printer secara bertahap (Chunking) untuk mencegah Bluetooth overflow
      _updateStatus("Mengirim data cetak ke printer...");
      await _sendDataInChunks(printBuffer);
      _updateStatus("Cetak PDF selesai!");
    } catch (e) {
      _updateStatus("Gagal memproses PDF: \$e");
    } finally {
      setState(() {
        _isPrinting = false;
      });
    }
  }

  // Mengubah Gambar ke ESC/POS Raster format (Command: GS v 0 m xL xH yL yH d1...dk)
  List<int> _convertToEscPosRaster(img.Image image, int targetWidth) {
    List<int> bytes = [];
    
    // Pastikan lebar gambar habis dibagi 8 (keperluan byte packing)
    int width = (targetWidth / 8).floor() * 8;
    int height = image.height;

    int xBytes = (width / 8).floor();
    int xL = xBytes % 256;
    int xH = (xBytes / 256).floor();
    int yL = height % 256;
    int yH = (height / 256).floor();

    // Perintah GS v 0 m xL xH yL yH
    bytes.addAll([0x1D, 0x61, 0x00]); // Batalkan perataan tengah sementara
    bytes.addAll([0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH]);

    // Lakukan konversi thresholding piksel ke bit biner (1=Black, 0=White)
    for (int y = 0; y < height; y++) {
      for (int x = 0; x < xBytes; x++) {
        int slice = 0;
        for (int b = 0; b < 8; b++) {
          int pixelX = (x * 8) + b;
          if (pixelX < width) {
            // Ambil luminance piksel
            var pixel = image.getPixel(pixelX, y);
            // Standar threshold untuk menentukan hitam vs putih
            double luminance = (pixel.r * 0.299 + pixel.g * 0.587 + pixel.b * 0.114);
            if (luminance < 128) { // Jika gelap, nyalakan bit hitam (1)
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

    final int size = ${chunkSize};
    final int totalLength = bytes.length;
    
    for (int i = 0; i < totalLength; i += size) {
      int end = (i + size < totalLength) ? i + size : totalLength;
      List<int> chunk = bytes.sublist(i, end);
      
      try {
        await _writeCharacteristic!.write(Uint8List.fromList(chunk), withoutResponse: true);
        // Berikan jeda sangat singkat agar modul Bluetooth printer sempat memproses buffer
        await Future.delayed(const Duration(milliseconds: 15));
      } catch (e) {
        debugPrint("Gagal menulis chunk ke Bluetooth: \$e");
        break;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Print Bridge Thermal'),
        backgroundColor: Colors.blue[800],
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status Card
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
            
            // Connection Info
            Row(
              mainAxisAlignment: MainAxisAlignment.between,
              children: [
                Text(
                  _connectedPrinter != null 
                    ? "Printer: \${_connectedPrinter!.platformName}" 
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

            // Scan Results List
            Expanded(
              child: _scanResults.isEmpty
                ? Center(
                    child: Text(
                      "Tidak ada perangkat thermal printer ditemukan.\\nPastikan Bluetooth printer menyala.",
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
            
            // Shared file indicator
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
                        "File mengantre: \${_sharedFiles.first.path.split('/').last}",
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
`;

  const androidManifestCode = `<!-- android/app/src/main/AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${packageName}">

    <!-- 1. Izin Akses Bluetooth untuk Android 11 ke bawah -->
    <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" android:maxSdkVersion="30" />

    <!-- 2. Izin Akses Bluetooth Baru untuk Android 12+ (Wajib untuk standard SDK terbaru) -->
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />

    <application
        android:label="Print Bridge"
        android:name="\${applicationName}"
        android:icon="@mipmap/ic_launcher">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            
            <!-- Default launch intent -->
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>

            <!-- 
              KUNCI UTAMA: Intent Filter agar Aplikasi Muncul di Menu 'Share' Android
              Filter ini menangkap kiriman file berformat PDF (.pdf) dari aplikasi lain
            -->
            <intent-filter android:label="Kirim ke Printer Thermal (Print Bridge)">
                <action android:name="android.intent.action.SEND" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="application/pdf" />
            </intent-filter>

        </activity>
        
        <!-- Don't delete the meta-data below.
             This is used by the Flutter tool to generate GeneratedPluginRegistrant. -->
        <meta-data
            android:name="flutterEmbedding"
            android:value="2" />
    </application>
</manifest>
`;

  const pubspecCode = `# pubspec.yaml
name: print_bridge_thermal
description: A new Flutter PDF Print Bridge for ESC/POS Bluetooth Thermal Printers.
version: 1.0.0+1

environment:
  sdk: '>=3.2.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter

  # 1. Menghubungkan dan mengirim data byte ke printer Bluetooth
  flutter_blue_plus: ^1.31.10

  # 2. Mendeteksi file PDF yang dibagikan via menu "Share" Android
  receive_sharing_intent: ^1.6.0

  # 3. Merender halaman PDF menjadi gambar (PNG/JPEG) agar bisa di-print sebagai bitmap
  pdfx: ^2.6.0

  # 4. Mengolah byte piksel gambar (meresize, thresholding, dither grayscale)
  image: ^4.1.3

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
`;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased pb-12">
      {/* Visual Header Grid Accent */}
      <div className="absolute top-0 left-0 w-full h-80 bg-gradient-to-b from-blue-600/10 via-violet-600/5 to-transparent pointer-events-none" />
      
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-md sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg shadow-blue-500/25">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-lg tracking-tight text-white flex items-center gap-2">
                Flutter Print Bridge
                <span className="text-[10px] uppercase font-bold tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded">
                  ESC/POS
                </span>
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">Companion & Simulator Generator PDF Thermal Printing</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-xs font-mono text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700/50 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Workspace Active
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
        
        {/* LEFT COLUMN: Simulator, Settings & Live Playground (Lg: 5 columns) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card 1: Configuration Parameters */}
          <div className="bg-slate-850 rounded-xl border border-slate-800 p-5 shadow-xl relative overflow-hidden" id="config-card">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h2 className="font-semibold text-sm tracking-wide text-white flex items-center gap-2 uppercase">
                <Sliders className="w-4 h-4 text-blue-400" />
                Konfigurasi Parameter
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">Dynamic Values</span>
            </div>

            <div className="space-y-4">
              {/* Package ID input */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex justify-between">
                  <span>Android Package ID</span>
                  <span className="text-[10px] text-slate-500 font-mono">AndroidManifest.xml</span>
                </label>
                <input 
                  type="text" 
                  value={packageName} 
                  onChange={(e) => setPackageName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                  placeholder="com.example.print_bridge"
                />
              </div>

              {/* Grid 2 Columns */}
              <div className="grid grid-cols-2 gap-4">
                {/* Paper Width Selection */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Lebar Kertas Kertas</label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 border border-slate-700 rounded-lg">
                    <button 
                      onClick={() => setPaperWidth("58mm")}
                      className={`py-1.5 text-xs font-medium rounded-md transition-all ${paperWidth === "58mm" ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      58mm (384)
                    </button>
                    <button 
                      onClick={() => setPaperWidth("80mm")}
                      className={`py-1.5 text-xs font-medium rounded-md transition-all ${paperWidth === "80mm" ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      80mm (576)
                    </button>
                  </div>
                </div>

                {/* Auto Connect Toggle */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Auto-Connect BT</label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 border border-slate-700 rounded-lg">
                    <button 
                      onClick={() => setAutoConnect(true)}
                      className={`py-1.5 text-xs font-medium rounded-md transition-all ${autoConnect ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      Aktif
                    </button>
                    <button 
                      onClick={() => setAutoConnect(false)}
                      className={`py-1.5 text-xs font-medium rounded-md transition-all ${!autoConnect ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      Nonaktif
                    </button>
                  </div>
                </div>
              </div>

              {/* Slider Feed Lines */}
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                  <span>Feed Lines (Jarak Kosong Akhir)</span>
                  <span className="font-mono text-blue-400">{feedLines} Baris</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="6" 
                  value={feedLines} 
                  onChange={(e) => setFeedLines(parseInt(e.target.value))}
                  className="w-full accent-blue-500 bg-slate-900 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Advanced collapse toggler */}
              <div className="pt-2 border-t border-slate-800">
                <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-400">
                  <div>
                    <span className="block font-medium">BLE Chunk Buffer:</span>
                    <span className="font-mono text-slate-300">{chunkSize} Bytes</span>
                  </div>
                  <div>
                    <span className="block font-medium">PDF Render DPI:</span>
                    <span className="font-mono text-slate-300">{pdfRenderingDpi} DPI</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Card 2: Interactive Sandbox Mobile Simulator */}
          <div className="bg-slate-850 rounded-xl border border-slate-800 p-5 shadow-xl relative" id="sandbox-card">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-semibold text-sm tracking-wide text-white flex items-center gap-2 uppercase">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                Android Print Bridge Sandbox
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></span>
            </div>

            {/* Sandbox Simulation Panel */}
            <div className="space-y-4">
              
              {/* Trigger Share Intent Action */}
              <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  1. Simulasi Aksi "Share PDF" dari Android
                </span>
                <p className="text-[11px] text-slate-400 mb-3">
                  Pilih salah satu template PDF di bawah ini untuk mensimulasikan file yang dikirim via menu Share sistem Android.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => triggerShareSimulation("retail_invoice")}
                    className={`p-2 text-[10px] rounded border font-medium flex flex-col items-center justify-center gap-1 transition-all ${sharedPdf?.content === 'retail_invoice' ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'bg-slate-850 border-slate-700 text-slate-300 hover:border-slate-600'}`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Invoice Retail
                  </button>
                  <button 
                    onClick={() => triggerShareSimulation("event_ticket")}
                    className={`p-2 text-[10px] rounded border font-medium flex flex-col items-center justify-center gap-1 transition-all ${sharedPdf?.content === 'event_ticket' ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'bg-slate-850 border-slate-700 text-slate-300 hover:border-slate-600'}`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Tiket Wahana
                  </button>
                  <button 
                    onClick={() => triggerShareSimulation("shipping_label")}
                    className={`p-2 text-[10px] rounded border font-medium flex flex-col items-center justify-center gap-1 transition-all ${sharedPdf?.content === 'shipping_label' ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'bg-slate-850 border-slate-700 text-slate-300 hover:border-slate-600'}`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Resi Logistik
                  </button>
                </div>
              </div>

              {/* Shared PDF File State */}
              <AnimatePresence mode="wait">
                {sharedPdf && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="bg-emerald-500/10 border border-emerald-500/25 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1.5 bg-emerald-500/20 rounded text-emerald-400">
                        <Share2 className="w-4 h-4 animate-bounce" />
                      </div>
                      <div>
                        <span className="block text-xs font-semibold text-slate-200 font-mono truncate max-w-[200px]">
                          {sharedPdf.name}
                        </span>
                        <span className="text-[10px] text-slate-400">PDF Document • {sharedPdf.size}</span>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
                      Queued
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bluetooth Printer Connection Panel */}
              <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-800 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    2. Koneksi Bluetooth Printer (BLE)
                  </span>
                  <button 
                    onClick={startScan} 
                    disabled={scanning}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${scanning ? 'animate-spin' : ''}`} />
                    {scanning ? "Mencari..." : "Scan BT"}
                  </button>
                </div>

                {/* Device List */}
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {devices.map(d => (
                    <div 
                      key={d.id}
                      onClick={() => !d.connected && connectPrinter(d)}
                      className={`p-2 rounded border text-xs flex items-center justify-between transition-all cursor-pointer ${
                        d.connected 
                          ? 'bg-blue-600/10 border-blue-500/40 text-blue-200' 
                          : 'bg-slate-850 border-slate-700/60 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className={`p-1 rounded ${d.connected ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                          <Printer className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="block font-medium text-slate-200">{d.name}</span>
                          <span className="text-[9px] font-mono text-slate-500">{d.id} • RSSI: {d.rssi}dBm</span>
                        </div>
                      </div>
                      {d.connected ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-emerald-400 font-bold uppercase">Connected</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); disconnectPrinter(); }}
                            className="text-[9px] text-red-400 underline hover:text-red-300 ml-1"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={startPrintSim}
                  disabled={printing || !sharedPdf || !connectedDevice}
                  className={`py-2.5 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-all shadow-md ${
                    printing || !sharedPdf || !connectedDevice
                      ? 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:brightness-110 shadow-blue-600/10'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  {printing ? "Mencetak..." : "Cetak via Bridge"}
                </button>
                
                <button
                  onClick={() => {
                    setSharedPdf(null);
                    addLog("Clear shared PDF buffer", "warn");
                  }}
                  disabled={!sharedPdf}
                  className={`py-2.5 rounded-lg border font-medium text-xs flex items-center justify-center gap-1.5 transition-all ${
                    !sharedPdf
                      ? 'border-slate-800 text-slate-600 cursor-not-allowed'
                      : 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  Clear Buffer
                </button>
              </div>

            </div>
          </div>

          {/* Card 3: Terminal Console (Service Logs) */}
          <div className="bg-slate-850 rounded-xl border border-slate-800 p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-mono">
                <Terminal className="w-3.5 h-3.5 text-blue-400" />
                Print Bridge Logs (Live)
              </span>
              <button 
                onClick={() => setPrintLogs([])}
                className="text-[10px] text-slate-500 hover:text-slate-400 underline font-mono"
              >
                Clear Logs
              </button>
            </div>
            
            <div className="bg-slate-900 rounded-lg p-3 font-mono text-[10px] leading-relaxed h-44 overflow-y-auto space-y-1.5 border border-slate-800">
              {printLogs.length === 0 ? (
                <div className="text-slate-600 italic text-center py-8">Console kosong. Lakukan aksi untuk mencatat log.</div>
              ) : (
                printLogs.map((log, index) => (
                  <div key={index} className="flex items-start space-x-1.5">
                    <span className="text-slate-600">[{log.timestamp}]</span>
                    <span className={`font-semibold ${
                      log.type === 'success' ? 'text-emerald-400' :
                      log.type === 'error' ? 'text-rose-400' :
                      log.type === 'warn' ? 'text-amber-400' :
                      'text-blue-400'
                    }`}>
                      {log.type === 'success' ? '✔' : log.type === 'error' ? '✖' : log.type === 'warn' ? '⚠' : 'i'}
                    </span>
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                ))
              )}
              <div ref={receiptEndRef} />
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Code View and Documentation (Lg: 7 columns) */}
        <div className="lg:col-span-7 space-y-6">

          {/* Card 4: Code Output & Guidelines Tabs */}
          <div className="bg-slate-850 rounded-xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[740px]">
            
            {/* Header Tabs Navigation */}
            <div className="bg-slate-900 border-b border-slate-800 px-4 pt-3 flex flex-wrap gap-1">
              <button 
                onClick={() => setActiveTab("code")}
                className={`px-4 py-2 text-xs font-medium rounded-t-lg border-t-2 border-x transition-all flex items-center gap-1.5 ${
                  activeTab === "code" 
                    ? 'bg-slate-850 border-t-blue-500 border-x-slate-800 text-white' 
                    : 'bg-transparent border-t-transparent border-x-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code className="w-3.5 h-3.5 text-blue-400" />
                main.dart
              </button>

              <button 
                onClick={() => setActiveTab("manifest")}
                className={`px-4 py-2 text-xs font-medium rounded-t-lg border-t-2 border-x transition-all flex items-center gap-1.5 ${
                  activeTab === "manifest" 
                    ? 'bg-slate-850 border-t-blue-500 border-x-slate-800 text-white' 
                    : 'bg-transparent border-t-transparent border-x-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                AndroidManifest.xml
              </button>

              <button 
                onClick={() => setActiveTab("pubspec")}
                className={`px-4 py-2 text-xs font-medium rounded-t-lg border-t-2 border-x transition-all flex items-center gap-1.5 ${
                  activeTab === "pubspec" 
                    ? 'bg-slate-850 border-t-blue-500 border-x-slate-800 text-white' 
                    : 'bg-transparent border-t-transparent border-x-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Settings className="w-3.5 h-3.5 text-amber-400" />
                pubspec.yaml
              </button>

              <button 
                onClick={() => setActiveTab("guide")}
                className={`px-4 py-2 text-xs font-medium rounded-t-lg border-t-2 border-x transition-all flex items-center gap-1.5 ${
                  activeTab === "guide" 
                    ? 'bg-slate-850 border-t-blue-500 border-x-slate-800 text-white' 
                    : 'bg-transparent border-t-transparent border-x-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Info className="w-3.5 h-3.5 text-violet-400" />
                Panduan Penggunaan
              </button>
            </div>

            {/* Tab Contents Container */}
            <div className="flex-1 overflow-y-auto p-5 bg-slate-850 relative">
              
              {activeTab === "code" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-900 px-4 py-2.5 rounded-lg border border-slate-800">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      <span className="text-xs text-slate-300 font-mono">lib/main.dart (Flutter SDK 3.x)</span>
                    </div>
                    <button 
                      onClick={() => handleCopy(mainDartCode, "main")}
                      className="text-xs text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1 bg-slate-850 px-2 py-1 rounded border border-slate-700/80 transition-all active:scale-95"
                    >
                      {copiedStates["main"] ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Code
                        </>
                      )}
                    </button>
                  </div>

                  <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 relative font-mono text-xs overflow-x-auto text-slate-300 leading-relaxed max-h-[560px]">
                    <pre>{mainDartCode}</pre>
                  </div>
                </div>
              )}

              {activeTab === "manifest" && (
                <div className="space-y-4">
                  {/* Info Box */}
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3.5 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-300 leading-relaxed">
                      <span className="font-semibold text-white block mb-0.5">Konfigurasi MimeType Sharing</span>
                      Untuk menangkap file bertipe PDF, kita menambahkan sebuah <code className="bg-slate-900 px-1 rounded text-emerald-400 font-mono">&lt;intent-filter&gt;</code> khusus pada activity utama Android Anda. Gunakan <code className="bg-slate-900 px-1 rounded text-emerald-400 font-mono">&lt;data android:mimeType="application/pdf" /&gt;</code> agar aplikasi Anda otomatis terdaftar pada sistem Android saat user mengklik "Share" pada file PDF.
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-slate-900 px-4 py-2.5 rounded-lg border border-slate-800">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <span className="text-xs text-slate-300 font-mono">android/app/src/main/AndroidManifest.xml</span>
                    </div>
                    <button 
                      onClick={() => handleCopy(androidManifestCode, "manifest")}
                      className="text-xs text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1 bg-slate-850 px-2 py-1 rounded border border-slate-700/80 transition-all active:scale-95"
                    >
                      {copiedStates["manifest"] ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy XML
                        </>
                      )}
                    </button>
                  </div>

                  <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 relative font-mono text-xs overflow-x-auto text-slate-300 leading-relaxed">
                    <pre>{androidManifestCode}</pre>
                  </div>
                </div>
              )}

              {activeTab === "pubspec" && (
                <div className="space-y-4">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3.5 flex gap-3">
                    <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-300 leading-relaxed">
                      <span className="font-semibold text-white block mb-0.5">Penjelasan Library Kunci:</span>
                      <ul className="list-disc list-inside space-y-1 mt-1 text-slate-400">
                        <li><strong className="text-slate-200">flutter_blue_plus</strong>: Digunakan untuk memindai perangkat BLE, menyambungkan socket, dan mentransmisikan biner ESC/POS.</li>
                        <li><strong className="text-slate-200">receive_sharing_intent</strong>: Menangkap intent Android saat user membagikan berkas PDF ke aplikasi Anda.</li>
                        <li><strong className="text-slate-200">pdfx</strong>: Merender halaman PDF menjadi representasi byte gambar (raw PNG) langsung dari memory.</li>
                        <li><strong className="text-slate-200">image</strong>: Membaca pixel PNG dari pdfx dan mengonversinya ke bit biner hitam-putih untuk printer thermal.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-slate-900 px-4 py-2.5 rounded-lg border border-slate-800">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      <span className="text-xs text-slate-300 font-mono">pubspec.yaml</span>
                    </div>
                    <button 
                      onClick={() => handleCopy(pubspecCode, "pubspec")}
                      className="text-xs text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1 bg-slate-850 px-2 py-1 rounded border border-slate-700/80 transition-all active:scale-95"
                    >
                      {copiedStates["pubspec"] ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy YAML
                        </>
                      )}
                    </button>
                  </div>

                  <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 relative font-mono text-xs overflow-x-auto text-slate-300 leading-relaxed">
                    <pre>{pubspecCode}</pre>
                  </div>
                </div>
              )}

              {activeTab === "guide" && (
                <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
                  
                  <div>
                    <h4 className="font-bold text-white text-base mb-2 flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-xs text-white">1</span>
                      Langkah Instalasi Dependencies
                    </h4>
                    <p className="mb-2">
                      Tambahkan dependensi di bawah ini ke dalam proyek Flutter Anda dengan menjalankan perintah berikut di terminal proyek:
                    </p>
                    <div className="bg-slate-900 p-2.5 rounded border border-slate-800 font-mono text-xs text-blue-400 mb-2">
                      flutter pub add flutter_blue_plus receive_sharing_intent pdfx image
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-white text-base mb-2 flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-xs text-white">2</span>
                      Modifikasi AndroidManifest.xml
                    </h4>
                    <p className="mb-2">
                      Buka berkas <code className="bg-slate-900 px-1 py-0.5 rounded text-blue-300 font-mono text-xs">android/app/src/main/AndroidManifest.xml</code>.
                      Tempelkan kode <code className="bg-slate-900 px-1 rounded text-blue-300 font-mono text-xs">&lt;intent-filter&gt;</code> di dalam tag <code className="bg-slate-900 px-1 rounded text-blue-300 font-mono text-xs">&lt;activity&gt;</code> utama Anda seperti yang ditunjukkan pada tab <strong>AndroidManifest.xml</strong>.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-white text-base mb-2 flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-xs text-white">3</span>
                      Algoritma Konversi PDF ke Thermal (ESC/POS)
                    </h4>
                    <p className="mb-2">
                      Printer thermal bluetooth standard (ukuran 58mm atau 80mm) tidak dapat memproses file PDF mentah secara langsung karena printer ini hanya mengerti teks sederhana dan perintah raster bitmap biner. Oleh karena itu, kita melakukan konversi sebagai berikut:
                    </p>
                    <ul className="list-decimal list-inside space-y-2 text-slate-400 pl-2">
                      <li>
                        <strong className="text-slate-200">Rasterisasi Halaman:</strong> Membuka file PDF dan merender tiap halaman menjadi gambar PNG dengan resolusi tetap menggunakan plugin <code className="text-blue-300 font-mono text-xs bg-slate-900 px-1 rounded">pdfx</code>.
                      </li>
                      <li>
                        <strong className="text-slate-200">Thresholding Grayscale:</strong> Mengubah pixel warna atau abu-abu gambar menjadi pixel murni Hitam atau Putih (monochrome). Pixel dengan tingkat kecerahan (luminance) di bawah 128 bit diubah menjadi Hitam (1), dan di atas itu diubah menjadi Putih (0).
                      </li>
                      <li>
                        <strong className="text-slate-200">Byte Packing (Bit-Packing):</strong> Mengemas setiap 8 piksel horizontal menjadi 1 byte biner data. Hal ini wajib karena perintah <code className="text-blue-300 font-mono text-xs bg-slate-900 px-1 rounded">GS v 0</code> mencetak baris per baris byte bitmap.
                      </li>
                      <li>
                        <strong className="text-slate-200">Transmission Chunking (BLE):</strong> Bluetooth Low Energy (BLE) memiliki keterbatasan ukuran paket maksimum (MTU). Kami mengimplementasikan metode chunking di <code className="text-slate-200 font-mono">_sendDataInChunks</code> untuk membagi data biner menjadi pecahan kecil (contoh 128 byte) dengan jeda waktu singkat (15ms) agar pengiriman data stabil dan printer tidak mengalami buffering hang.
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-white text-base mb-2 flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-xs text-white">4</span>
                      Izin Bluetooth di Android 12+ (Android SDK 31 ke atas)
                    </h4>
                    <p className="mb-2">
                      Sistem Android modern memerlukan izin runtime yang ketat untuk Bluetooth. Pastikan aplikasi Anda meminta izin berikut saat runtime (menggunakan package <code className="text-blue-300 font-mono text-xs bg-slate-900 px-1 rounded">permission_handler</code>):
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
                      <li><code className="text-amber-400">Permission.bluetoothScan</code></li>
                      <li><code className="text-amber-400">Permission.bluetoothConnect</code></li>
                    </ul>
                  </div>

                </div>
              )}

            </div>
          </div>

          {/* Virtual Paper Printer Output Visualizer */}
          <div className="bg-slate-850 rounded-xl border border-slate-800 p-5 shadow-xl relative overflow-hidden" id="virtual-printer-card">
            
            {/* Ambient Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-semibold text-sm tracking-wide text-white flex items-center gap-2 uppercase">
                <Printer className="w-4 h-4 text-emerald-400 animate-pulse" />
                Virtual Thermal Printer Output
              </h3>
              <span className="text-[10px] uppercase font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                Paper Width: {paperWidth}
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Hasil simulasi cetak resi/tiket dari jembatan cetak PDF. Kertas thermal akan memanjang ke bawah seiring dengan aktivitas print.
            </p>

            {/* Simulated Paper Roll */}
            <div className="bg-slate-950 p-4 rounded-xl flex justify-center items-start min-h-[300px] border border-slate-850">
              
              <div 
                className={`bg-white text-black p-6 shadow-2xl transition-all duration-500 border-t-8 border-slate-200 relative ${
                  paperWidth === "58mm" ? "w-[280px]" : "w-[360px]"
                }`}
                style={{
                  boxShadow: "0 10px 30px -10px rgba(0,0,0,0.7)",
                  backgroundImage: "linear-gradient(90deg, #f9f9f9 0%, #ffffff 4%, #ffffff 96%, #f2f2f2 100%)"
                }}
              >
                {/* Jagged paper cut effect */}
                <div className="absolute -top-[8px] left-0 right-0 h-2 bg-slate-950" 
                     style={{ 
                       clipPath: "polygon(0% 100%, 5% 0%, 10% 100%, 15% 0%, 20% 100%, 25% 0%, 30% 100%, 35% 0%, 40% 100%, 45% 0%, 50% 100%, 55% 0%, 60% 100%, 65% 0%, 70% 100%, 75% 0%, 80% 100%, 85% 0%, 90% 100%, 95% 0%, 100% 100%)" 
                     }} 
                />

                {printedReceipts.length === 0 ? (
                  <div className="py-20 text-center text-gray-400 text-xs italic flex flex-col items-center justify-center gap-3">
                    <WifiOff className="w-8 h-8 text-gray-300 stroke-[1.5]" />
                    <span>Belum ada data cetakan.<br/>Pilih template PDF di atas lalu klik "Cetak via Bridge".</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {printedReceipts.map((receipt, index) => (
                      <div key={receipt.id} className="relative">
                        {index > 0 && <div className="border-t border-dashed border-gray-400 my-6 pt-4" />}
                        <div className="text-[8px] text-gray-400 font-mono mb-2 flex justify-between">
                          <span>File: {receipt.title}</span>
                          <span>{receipt.timestamp}</span>
                        </div>
                        {receipt.content}
                      </div>
                    ))}
                  </div>
                )}

                {/* Jagged paper bottom cut effect */}
                {printedReceipts.length > 0 && (
                  <div className="absolute -bottom-[8px] left-0 right-0 h-2 bg-slate-950" 
                       style={{ 
                         clipPath: "polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)" 
                       }} 
                  />
                )}
              </div>

            </div>

            {printedReceipts.length > 0 && (
              <div className="flex justify-end mt-3">
                <button 
                  onClick={() => {
                    setPrintedReceipts([]);
                    addLog("Kertas printer disobek (Clear virtual paper)", "info");
                  }}
                  className="text-xs text-red-400 hover:text-red-300 font-medium underline flex items-center gap-1"
                >
                  Sobek Kertas (Reset)
                </button>
              </div>
            )}

          </div>

        </div>

      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
        <p>© 2026 Flutter Bluetooth ESC/POS Print Bridge. Created for PDF share intent workflow integration.</p>
      </footer>
    </div>
  );
}
