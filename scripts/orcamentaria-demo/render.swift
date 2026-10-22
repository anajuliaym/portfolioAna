// Renders each page of the Orçamentária PDF to a JPEG at a fixed width (CoreGraphics via PDFKit; no poppler needed).
import PDFKit
import AppKit
let args = CommandLine.arguments
let doc = PDFDocument(url: URL(fileURLWithPath: args[1]))!
let out = args[2], width = CGFloat(Double(args[3]) ?? 1650)
for i in 0..<doc.pageCount {
  let p = doc.page(at: i)!; let b = p.bounds(for: .mediaBox); let s = width / b.width
  let img = p.thumbnail(of: NSSize(width: b.width * s, height: b.height * s), for: .mediaBox)
  let rep = NSBitmapImageRep(data: img.tiffRepresentation!)!
  try! rep.representation(using: .jpeg, properties: [.compressionFactor: 0.82])!.write(to: URL(fileURLWithPath: "\(out)/p\(i + 1).jpg"))
}
