export function getStorage() {
  return {};
}

export function ref(storage: any, path: string) {
  return { path };
}

export function uploadBytesResumable(ref: any, file: any) {
  const listeners: any[] = [];
  const uploadTask = {
    on: (event: string, progressCb: any, errorCb: any, completeCb: any) => {
      // Simulate state_changed progress and resolve immediately
      setTimeout(() => {
        if (progressCb) progressCb({ bytesTransferred: 100, totalBytes: 100 });
        setTimeout(() => {
          if (completeCb) completeCb();
        }, 100);
      }, 100);
    },
    snapshot: {
      ref
    }
  };
  return uploadTask;
}

export async function getDownloadURL(ref: any) {
  // Return high-quality, relevant Unsplash property image links depending on path or random seed
  const images = [
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"
  ];
  const idx = Math.abs(ref.path ? ref.path.length % images.length : 0);
  return images[idx];
}
