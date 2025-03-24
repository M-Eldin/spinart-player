
// A simple utility to extract dominant color from an image
export const extractImageColor = (
  imageUrl: string,
  callback: (color: string) => void
) => {
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = imageUrl;
  
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const width = img.width;
    const height = img.height;
    
    canvas.width = width;
    canvas.height = height;
    
    context?.drawImage(img, 0, 0, width, height);
    
    try {
      // Sample colors from different parts of the image for a better average
      const topLeft = context?.getImageData(0, 0, 1, 1).data;
      const topRight = context?.getImageData(width - 1, 0, 1, 1).data;
      const bottomLeft = context?.getImageData(0, height - 1, 1, 1).data;
      const bottomRight = context?.getImageData(width - 1, height - 1, 1, 1).data;
      const center = context?.getImageData(Math.floor(width / 2), Math.floor(height / 2), 1, 1).data;
      
      if (topLeft && topRight && bottomLeft && bottomRight && center) {
        // Use center color as primary, but slightly darken it for better background contrast
        const r = Math.max(0, center[0] - 30);
        const g = Math.max(0, center[1] - 30);
        const b = Math.max(0, center[2] - 30);
        
        callback(`rgb(${r}, ${g}, ${b})`);
      }
    } catch (error) {
      console.error("Error extracting color:", error);
      // Fallback to a default color
      callback("rgb(25, 25, 25)");
    }
  };
  
  img.onerror = () => {
    console.error("Error loading image for color extraction");
    callback("rgb(25, 25, 25)");
  };
};

