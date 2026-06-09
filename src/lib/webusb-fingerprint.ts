// Module WebUSB pour scanners d'empreintes digitales (DigitalPersona / SecuGen / génériques).
// Types WebUSB minimaux (le navigateur les fournit à l'exécution).
type USBDeviceFilter = { vendorId?: number; productId?: number; classCode?: number };
type USBEndpoint = { endpointNumber: number; direction: "in" | "out"; packetSize: number };
type USBAlternateInterface = { endpoints: USBEndpoint[] };
type USBInterface = { interfaceNumber: number; alternate: USBAlternateInterface };
type USBConfiguration = { interfaces: USBInterface[] };
type USBInTransferResult = { data?: DataView };
type USBDevice = {
  opened: boolean;
  configuration: USBConfiguration | null;
  vendorId: number;
  productId: number;
  productName?: string;
  manufacturerName?: string;
  open(): Promise<void>;
  selectConfiguration(n: number): Promise<void>;
  claimInterface(n: number): Promise<void>;
  transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>;
};
// L'API WebUSB ne dispose pas de drivers propriétaires : on récupère un "template" brut
// depuis l'endpoint IN du device. Pour les scanners non supportés ou en absence de matériel,
// `requestDevice` renverra une erreur que l'appelant pourra capter pour proposer un upload.

export interface FingerprintCapture {
  template: Uint8Array;     // données brutes du capteur (template binaire)
  preview?: Blob;           // image PNG/JPEG si fournie par le device
  device: { vendorId: number; productId: number; productName?: string; manufacturerName?: string };
}

// Vendor IDs reconnus (DigitalPersona, SecuGen, Suprema, Futronic, Lumidigm)
export const KNOWN_FP_VENDORS: USBDeviceFilter[] = [
  { vendorId: 0x05ba }, // DigitalPersona / U.are.U
  { vendorId: 0x1162 }, // SecuGen
  { vendorId: 0x16d1 }, // Suprema
  { vendorId: 0x2109 }, // Futronic
  { vendorId: 0x1c7a }, // LighTuning
  { vendorId: 0x147e }, // UPEK (Authentec)
  { vendorId: 0x08ff }, // AuthenTec
];

function hasWebUSB(): boolean {
  return typeof navigator !== "undefined" && "usb" in navigator;
}

export function isWebUSBSupported(): boolean {
  return hasWebUSB();
}

/**
 * Demande à l'utilisateur de sélectionner un scanner USB compatible.
 * Doit être appelé dans un handler utilisateur (clic).
 */
export async function pickFingerprintDevice(): Promise<USBDevice> {
  if (!hasWebUSB()) throw new Error("WebUSB n'est pas supporté par ce navigateur (utilisez Chrome/Edge sur HTTPS).");
  const device = await (navigator as any).usb.requestDevice({ filters: KNOWN_FP_VENDORS });
  return device as USBDevice;
}

/**
 * Ouvre le device, sélectionne la configuration/interface puis lit un paquet
 * sur le premier endpoint IN trouvé. Le résultat est traité comme un template
 * propriétaire (chiffré côté serveur avant stockage).
 */
export async function captureFingerprint(device: USBDevice, timeoutMs = 8000): Promise<FingerprintCapture> {
  if (!device.opened) await device.open();
  if (device.configuration === null) await device.selectConfiguration(1);
  const iface = device.configuration!.interfaces[0];
  try { await device.claimInterface(iface.interfaceNumber); } catch { /* déjà claim */ }

  const alt = iface.alternate;
  const inEndpoint = alt.endpoints.find((e) => e.direction === "in");
  if (!inEndpoint) throw new Error("Aucun endpoint IN sur ce scanner");

  // Boucle de lecture jusqu'à obtenir un paquet non vide ou timeout
  const start = Date.now();
  let buf = new Uint8Array(0);
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await device.transferIn(inEndpoint.endpointNumber, inEndpoint.packetSize);
      if (res.data && res.data.byteLength > 0) {
        const view = res.data;
        const copy = new Uint8Array(view.byteLength);
        copy.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
        buf = copy;
        if (buf.length >= 64) break;
      }
    } catch {
      break;
    }
  }

  if (buf.length === 0) throw new Error("Aucune donnée reçue du scanner — vérifiez le doigt sur le capteur");

  return {
    template: buf,
    device: {
      vendorId: device.vendorId,
      productId: device.productId,
      productName: device.productName,
      manufacturerName: device.manufacturerName,
    },
  };
}

/** Convertit un Uint8Array en base64 (sans dépendance Node). */
export function uint8ToBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
