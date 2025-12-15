import os
from PIL import Image

def optimize_images(directory):
    for filename in os.listdir(directory):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            filepath = os.path.join(directory, filename)
            try:
                with Image.open(filepath) as img:
                    # Calculate new size maintaining aspect ratio
                    width, height = img.size
                    
                    # More aggressive sizing
                    max_dimension = 600 
                    
                    if "avatar" in filename or "suhaib" in filename or "ibrahim" in filename:
                        max_dimension = 250 # Avatars don't need to be huge (displayed at ~130px)
                    elif "thumb" in filename or "info" in filename:
                        max_dimension = 500 # Thumbnails displayed in grid

                    if width > max_dimension or height > max_dimension:
                        # Resize
                        if width > height:
                            new_width = max_dimension
                            new_height = int(height * (max_dimension / width))
                        else:
                            new_height = max_dimension
                            new_width = int(width * (max_dimension / height))
                        
                        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                        print(f"Resized {filename} to {new_width}x{new_height}")

                    # Save with optimization
                    # Overwrite the file
                    if filename.lower().endswith('.png'):
                        # If it's a thumbnail or info graphics, it might be better as JPG if no transparency
                        # But to be safe we keep PNG but reduce colors or optimize hard? 
                        # PIL optimize=True is decent but not magic.
                        # Let's try to save as optimized PNG
                        img.save(filepath, optimize=True, compress_level=9)
                    elif filename.lower().endswith(('.jpg', '.jpeg')):
                        img.save(filepath, optimize=True, quality=65)
                    
                    print(f"Optimized {filename}")
            except Exception as e:
                print(f"Failed to process {filename}: {e}")

if __name__ == "__main__":
    assets_dir = os.path.join(os.getcwd(), "assets")
    optimize_images(assets_dir)
