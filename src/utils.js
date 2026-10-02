import { supabase } from './supabaseClient';

/**
 * Extracts the file path from a Supabase Storage public URL
 * Example: https://[ID].supabase.co/storage/v1/object/public/sheet-music/global/song.jpg
 * Returns: 'global/song.jpg'
 */
export const getStoragePathFromUrl = (url, bucketName = 'sheet-music') => {
  if (!url) return null;
  const parts = url.split(`/${bucketName}/`);
  return parts.length > 1 ? parts[1] : null;
};

/**
 * Deletes a file from Supabase Storage by its public URL
 */
export const deleteFileFromStorage = async (url, bucketName = 'sheet-music') => {
  try {
    const path = getStoragePathFromUrl(url, bucketName);
    if (!path) return true; // No file to delete

    const { error } = await supabase.storage.from(bucketName).remove([path]);
    if (error) {
      console.error('Failed to delete file from storage:', error);
      return false;
    }
    console.log('Successfully deleted file from storage:', path);
    return true;
  } catch (err) {
    console.error('Error during storage deletion:', err);
    return false;
  }
};
