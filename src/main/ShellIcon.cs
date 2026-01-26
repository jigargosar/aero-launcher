using System;
using System.Runtime.InteropServices;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Text;

public class ShellIcon {
    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    static extern int SHCreateItemFromParsingName(string pszPath, IntPtr pbc, ref Guid riid, out IShellItem ppv);

    [ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("43826d1e-e718-42ee-bc55-a1e261c37bfe")]
    interface IShellItem {
        void BindToHandler(IntPtr pbc, ref Guid bhid, ref Guid riid, out IntPtr ppv);
        void GetParent(out IShellItem ppsi);
        void GetDisplayName(uint sigdnName, out IntPtr ppszName);
        void GetAttributes(uint sfgaoMask, out uint psfgaoAttribs);
        void Compare(IShellItem psi, uint hint, out int piOrder);
    }

    [ComImport, Guid("bcc18b79-ba16-442f-80c4-8a59c30c463b"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IShellItemImageFactory {
        void GetImage([MarshalAs(UnmanagedType.Struct)] SIZE size, int flags, out IntPtr phbm);
    }

    [StructLayout(LayoutKind.Sequential)]
    struct SIZE { public int cx; public int cy; }

    [StructLayout(LayoutKind.Sequential)]
    struct DIBSECTION {
        public BITMAP dsBm;
        public BITMAPINFOHEADER dsBmih;
        public uint dsBitfields0, dsBitfields1, dsBitfields2;
        public IntPtr dshSection;
        public uint dsOffset;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct BITMAP {
        public int bmType, bmWidth, bmHeight, bmWidthBytes;
        public ushort bmPlanes, bmBitsPixel;
        public IntPtr bmBits;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct BITMAPINFOHEADER {
        public uint biSize;
        public int biWidth, biHeight;
        public ushort biPlanes, biBitCount;
        public uint biCompression, biSizeImage;
        public int biXPelsPerMeter, biYPelsPerMeter;
        public uint biClrUsed, biClrImportant;
    }

    [DllImport("gdi32.dll")]
    static extern bool DeleteObject(IntPtr hObject);

    [DllImport("gdi32.dll")]
    static extern int GetObject(IntPtr hObject, int nCount, ref DIBSECTION lpObject);

    public static string GetIconBase64(string shellPath, int size) {
        Guid shellItemGuid = typeof(IShellItem).GUID;
        IShellItem item;
        int hr = SHCreateItemFromParsingName(shellPath, IntPtr.Zero, ref shellItemGuid, out item);
        if (hr != 0) return null;

        IShellItemImageFactory factory = (IShellItemImageFactory)item;
        IntPtr hBitmap;
        factory.GetImage(new SIZE { cx = size, cy = size }, 0, out hBitmap);

        DIBSECTION dib = new DIBSECTION();
        GetObject(hBitmap, Marshal.SizeOf(dib), ref dib);

        int w = dib.dsBm.bmWidth, h = dib.dsBm.bmHeight, stride = dib.dsBm.bmWidthBytes;
        if (dib.dsBm.bmBits == IntPtr.Zero) { DeleteObject(hBitmap); return null; }

        byte[] pixels = new byte[h * stride];
        Marshal.Copy(dib.dsBm.bmBits, pixels, 0, pixels.Length);

        byte[] flipped = new byte[pixels.Length];
        for (int y = 0; y < h; y++)
            Array.Copy(pixels, (h - 1 - y) * stride, flipped, y * stride, stride);

        Bitmap bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
        BitmapData bd = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
        Marshal.Copy(flipped, 0, bd.Scan0, flipped.Length);
        bmp.UnlockBits(bd);
        DeleteObject(hBitmap);

        using (MemoryStream ms = new MemoryStream()) {
            bmp.Save(ms, ImageFormat.Png);
            bmp.Dispose();
            return Convert.ToBase64String(ms.ToArray());
        }
    }

    // Batch method: paths separated by | character, returns JSON array
    public static string GetIconsBase64(string pathsDelimited, int size) {
        string[] paths = pathsDelimited.Split('|');
        StringBuilder sb = new StringBuilder();
        sb.Append("[");
        for (int i = 0; i < paths.Length; i++) {
            string path = paths[i].Trim();
            if (string.IsNullOrEmpty(path)) continue;

            string icon = GetIconBase64(path, size);

            if (i > 0) sb.Append(",");
            sb.Append("{\"path\":\"");
            sb.Append(path.Replace("\\", "\\\\").Replace("\"", "\\\""));
            sb.Append("\",\"icon\":");
            if (icon != null) {
                sb.Append("\"");
                sb.Append(icon);
                sb.Append("\"");
            } else {
                sb.Append("null");
            }
            sb.Append("}");
        }
        sb.Append("]");
        return sb.ToString();
    }
}