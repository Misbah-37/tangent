/* Shared local image decoding, encoding and ZIP naming. */
window.TangentMedia = (() => {
  const checkSize = (width, height) => {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 10000 || height > 10000 || width * height > 25000000)
      throw new Error('Use whole-number dimensions from 1 to 10,000 pixels, with at most 25 million pixels total.');
  };
  const loadImage = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read ' + file.name));
    reader.onabort = () => reject(new Error('Image read cancelled.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Could not decode ' + file.name + '. Choose a supported, undamaged image.'));
      image.onload = () => { try { checkSize(image.naturalWidth, image.naturalHeight); resolve(image); } catch (error) { reject(error); } };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
  const mime = type => ['image/jpeg', 'image/png', 'image/webp'].includes(type) ? type : 'image/png';
  const extension = type => ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'})[type] || 'png';
  const encode = (canvas, type, quality) => new Promise((resolve, reject) => {
    try { checkSize(canvas.width, canvas.height); canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image encoding failed. Try smaller dimensions.')), mime(type), quality); }
    catch (error) { reject(error); }
  });
  const uniqueName = (used, filename, suffix, type) => {
    const base = (filename.replace(/\.[^/.]+$/, '').replace(/[\\/]/g, '_') || 'image') + suffix;
    const ext = extension(type);let name = `${base}.${ext}`, index = 2;
    while (used.has(name.toLowerCase())) name = `${base}_${index++}.${ext}`;
    used.add(name.toLowerCase());return name;
  };
  const clearLink = link => { if (link.getAttribute('href')?.startsWith('blob:')) URL.revokeObjectURL(link.href); link.removeAttribute('href');link.style.display='none'; };
  const setLink = (link, blob, name) => { clearLink(link);link.href=URL.createObjectURL(blob);link.download=name;link.style.display='inline-flex'; };
  return {checkSize,loadImage,mime,extension,encode,uniqueName,clearLink,setLink};
})();
