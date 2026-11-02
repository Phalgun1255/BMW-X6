import os
from PIL import Image, ImageOps

def process_cars():
    os.makedirs('assets/cars', exist_ok=True)
    
    files = {
        'gt-e.webp': ('C:/Users/Lenovo/.gemini/antigravity/brain/8fba5815-a46c-41d8-9986-89d80b47a8bd/gt_e_1793624250590.jpg', True), # Flip to face right
        's.webp': ('C:/Users/Lenovo/.gemini/antigravity/brain/8fba5815-a46c-41d8-9986-89d80b47a8bd/s_1793624277030.jpg', False),
        'x.webp': ('C:/Users/Lenovo/.gemini/antigravity/brain/8fba5815-a46c-41d8-9986-89d80b47a8bd/x_1793624303228.jpg', False),
        'r.webp': ('C:/Users/Lenovo/.gemini/antigravity/brain/8fba5815-a46c-41d8-9986-89d80b47a8bd/r_1793624325675.jpg', False),
        'one.webp': ('C:/Users/Lenovo/.gemini/antigravity/brain/8fba5815-a46c-41d8-9986-89d80b47a8bd/one_1793624349771.jpg', False),
    }
    
    target_width = 1600
    target_height = 900
    
    for filename, (src_path, flip) in files.items():
        with Image.open(src_path) as im:
            im = im.convert('RGB')
            if flip:
                im = ImageOps.mirror(im)
            
            # Resize to 1600x900
            im_resized = im.resize((target_width, target_height), Image.Resampling.LANCZOS)
            out_path = os.path.join('assets/cars', filename)
            im_resized.save(out_path, 'WEBP', quality=85, method=6)
            print(f'Saved {out_path} ({os.path.getsize(out_path)} bytes)')

if __name__ == '__main__':
    process_cars()

