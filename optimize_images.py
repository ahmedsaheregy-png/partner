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
                    
                    # Deciding max dimension based on file type/usage guesses
                    # Avatars and icons usually don't need to be huge
                    # Thumbnails might need a bit more, but 800px is usually plenty for web
                    max_dimension = 800
                    
                    if "avatar" in filename or "icon" in filename:
                        max_dimension = 400
                    
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
                        img.save(filepath, optimize=True)
                    elif filename.lower().endswith(('.jpg', '.jpeg')):
                        img.save(filepath, optimize=True, quality=80)
                    
                    print(f"Optimized {filename}")
            except Exception as e:
                print(f"Failed to process {filename}: {e}")

if __name__ == "__main__":
    assets_dir = os.path.join(os.getcwd(), "assets")
    optimize_images(assets_dir)
