import fitz  # PyMuPDF
import argparse
from pathlib import Path
import os
import tempfile
from concurrent.futures import ThreadPoolExecutor
import shutil
import traceback

def analyze_image(doc, xref):
    """分析图像属性，返回适合的压缩策略"""
    try:
        img_info = doc.extract_image(xref)
        img_bytes = img_info["image"]
        img_ext = img_info["ext"].lower()
        img_size = len(img_bytes)
        
        # 计算图像原始DPI（如果信息可用）
        width = img_info.get("width", 0)
        height = img_info.get("height", 0)
        if width > 0 and height > 0:
            page_rect = doc[0].rect
            page_width = page_rect[2] - page_rect[0]
            page_height = page_rect[3] - page_rect[1]
            # 估算DPI（假设图像占据整个页面）
            dpi_x = (width * 72) / page_width
            dpi_y = (height * 72) / page_height
            estimated_dpi = max(dpi_x, dpi_y)
        else:
            estimated_dpi = 300  # 默认假设为300DPI
        
        # 根据图像类型和大小决定压缩策略
        strategy = {
            "compress": True,  # 默认压缩
            "target_dpi": min(estimated_dpi, 150),  # 不提高DPI
            "quality": 75,  # 默认质量
            "force_jpeg": False  # 不强制转换格式
        }
        
        # 如果是JPEG且已经很小，可能不需要重新压缩
        if img_ext in ["jpg", "jpeg"] and img_size < 1024 * 100:  # 小于100KB
            strategy["compress"] = False
        
        # 如果是PNG透明图像，保持PNG格式
        if img_ext == "png":
            strategy["force_jpeg"] = False
        
        return strategy
        
    except Exception as e:
        print(f"警告: 分析图像 {xref} 失败: {str(e)}")
        # 默认压缩策略
        return {
            "compress": True,
            "target_dpi": 150,
            "quality": 75,
            "force_jpeg": True
        }

def compress_pdf(input_pdf, output_pdf, dpi=150, quality=75, remove_metadata=True, remove_annotations=True, smart_mode=True):
    """
    压缩 PDF 文件
    参数:
        input_pdf: 输入 PDF 文件路径
        output_pdf: 输出 PDF 文件路径
        dpi: 图像目标 DPI
        quality: 图像质量百分比
        remove_metadata: 是否移除元数据
        remove_annotations: 是否移除注释
        smart_mode: 是否启用智能压缩模式
    """
    try:
        # 创建临时目录用于处理图像
        with tempfile.TemporaryDirectory() as temp_dir:
            doc = fitz.open(input_pdf)
            
            # 删除元数据
            if remove_metadata:
                doc.set_metadata({})
            
            # 删除注释
            if remove_annotations:
                for page in doc:
                    annots = page.annots()
                    for annot in annots:
                        page.delete_annot(annot)
            
            # 记录原始和压缩后的图像大小
            original_size = 0
            compressed_size = 0
            
            # 压缩图像
            for page_num, page in enumerate(doc):
                images = page.get_images(full=True)
                if not images:
                    print(f"页面 {page_num + 1} 没有图像")
                    continue
                
                for img_index, img in enumerate(images):
                    try:
                        xref = img[0]
                        base_image = doc.extract_image(xref)
                        image_bytes = base_image["image"]
                        original_size += len(image_bytes)
                        
                        # 创建唯一的临时文件名
                        temp_image_path = os.path.join(temp_dir, f"img_{page_num}_{img_index}")
                        
                        # 获取图像信息
                        width = img[2]
                        height = img[3]
                        img_format = base_image['ext'].lower()
                        print(f"页面 {page_num + 1} 图像 {img_index}: 原始尺寸 {width}x{height}, 格式 {img_format}, 大小 {len(image_bytes)/1024:.2f}KB")
                        
                        # 使用智能策略或默认参数
                        if smart_mode:
                            strategy = analyze_image(doc, xref)
                            img_dpi = min(dpi, strategy["target_dpi"])  # 取较小的DPI
                            img_quality = strategy["quality"]
                            should_compress = strategy["compress"]
                            force_jpeg = strategy["force_jpeg"]
                        else:
                            img_dpi = dpi
                            img_quality = quality
                            should_compress = True
                            force_jpeg = True
                        
                        # 如果不需要压缩，直接使用原图
                        if not should_compress:
                            print(f"页面 {page_num + 1} 图像 {img_index}: 尺寸合适，跳过压缩")
                            with open(temp_image_path, 'wb') as f:
                                f.write(image_bytes)
                            compressed_size += len(image_bytes)
                            
                            # 确保图像位置信息有效
                            if len(img) >= 11 and img[10]:
                                page.insert_image(img[10], filename=temp_image_path)
                            else:
                                rect = fitz.Rect(0, 0, width, height)
                                page.insert_image(rect, filename=temp_image_path)
                            continue
                        
                        # 处理图像
                        try:
                            # 尝试标准方式创建 Pixmap
                            pix = fitz.Pixmap(doc, xref)
                            
                            # 转换为 RGB 格式
                            if str(fitz.csRGB) not in str(pix.colorspace):
                                pix = fitz.Pixmap(fitz.csRGB, pix)
                            
                            # 计算缩放比例
                            zoom = img_dpi / 72
                            
                            # 缩小图像
                            if zoom < 1.0:
                                mat = fitz.Matrix(zoom, zoom)
                                scaled_pix = fitz.Pixmap(pix, 0, mat)
                            else:
                                scaled_pix = pix  # 不放大图像
                            
                            # 确定保存格式和参数
                            if force_jpeg or img_format in ["jpg", "jpeg"]:
                                # 使用JPEG格式
                                temp_image_path += ".jpg"
                                scaled_pix.save(temp_image_path, quality=img_quality, subsampling=0)
                            else:
                                # 使用原始格式(如PNG)
                                temp_image_path += "." + img_format
                                scaled_pix.save(temp_image_path)
                            
                            # 释放缩放后的 Pixmap
                            if scaled_pix != pix:
                                scaled_pix = None
                            
                            # 替换 PDF 中的图像
                            if len(img) >= 11 and img[10]:
                                page.insert_image(img[10], filename=temp_image_path)
                            else:
                                rect = fitz.Rect(0, 0, width * zoom, height * zoom)
                                page.insert_image(rect, filename=temp_image_path)
                            
                        except Exception as e:
                            print(f"警告: 页面 {page_num + 1} 图像 {img_index} 转换失败，使用原图: {str(e)}")
                            # 转换失败时的备选方案：使用原始图像
                            with open(temp_image_path, 'wb') as f:
                                f.write(image_bytes)
                            
                            if len(img) >= 11 and img[10]:
                                page.insert_image(img[10], filename=temp_image_path)
                            else:
                                rect = fitz.Rect(0, 0, width, height)
                                page.insert_image(rect, filename=temp_image_path)
                        
                        # 计算压缩后的大小
                        compressed_size += os.path.getsize(temp_image_path)
                        print(f"页面 {page_num + 1} 图像 {img_index}: 压缩前 {len(image_bytes)/1024:.2f}KB -> 压缩后 {os.path.getsize(temp_image_path)/1024:.2f}KB")
                        
                    except Exception as e:
                        print(f"严重警告: 处理页面 {page_num + 1} 的图像 {img_index} 时出错: {str(e)}")
                        traceback.print_exc()
            
            # 保存压缩后的 PDF
            doc.save(output_pdf, garbage=4, deflate=True)
            doc.close()
            
            # 计算并打印压缩统计
            if original_size > 0:
                reduction = (1 - compressed_size / original_size) * 100
                print(f"图像总压缩率: {reduction:.2f}%")
            else:
                print("PDF 中没有图像需要压缩")
            
            # 计算文件级压缩率
            original_file_size = os.path.getsize(input_pdf)
            compressed_file_size = os.path.getsize(output_pdf)
            file_reduction = (1 - compressed_file_size / original_file_size) * 100
            print(f"文件总压缩率: {file_reduction:.2f}%")
            
            if file_reduction < 0:
                print("警告: 文件大小增加，可能是由于PDF重构开销或图像格式转换导致")
            
            print(f"处理完成: {input_pdf} -> {output_pdf}")
            
    except Exception as e:
        print(f"错误: 压缩 {input_pdf} 时发生异常: {str(e)}")
        traceback.print_exc()
        return False
    return True

def batch_compress(input_folder, output_folder, dpi=150, quality=75, remove_metadata=True, remove_annotations=True, smart_mode=True, threads=4):
    """
    批量压缩文件夹中的 PDF 文件
    参数:
        input_folder: 输入文件夹路径
        output_folder: 输出文件夹路径
        dpi: 图像目标 DPI
        quality: 图像质量百分比
        remove_metadata: 是否移除元数据
        remove_annotations: 是否移除注释
        smart_mode: 是否启用智能压缩模式
        threads: 并行处理线程数
    """
    input_folder = Path(input_folder)
    output_folder = Path(output_folder)
    output_folder.mkdir(parents=True, exist_ok=True)
    
    pdf_files = [f for f in input_folder.glob("*.pdf")]
    
    if not pdf_files:
        print(f"错误: 在 {input_folder} 中未找到 PDF 文件")
        return
    
    print(f"找到 {len(pdf_files)} 个 PDF 文件，开始批量压缩...")
    
    def process_file(pdf_file):
        output_file = output_folder / pdf_file.name
        print(f"正在处理: {pdf_file}")
        success = compress_pdf(pdf_file, output_file, dpi, quality, remove_metadata, remove_annotations, smart_mode)
        if success:
            original_size = os.path.getsize(pdf_file)
            compressed_size = os.path.getsize(output_file)
            reduction = (1 - compressed_size / original_size) * 100
            print(f"文件压缩率: {reduction:.2f}%")
    
    with ThreadPoolExecutor(max_workers=threads) as executor:
        executor.map(process_file, pdf_files)
    
    print(f"批量压缩完成，结果保存在: {output_folder}")

def main():
    parser = argparse.ArgumentParser(description="PDF 压缩工具")
    parser.add_argument("-i", "--input", required=True, help="输入 PDF 文件或文件夹路径")
    parser.add_argument("-o", "--output", required=True, help="输出 PDF 文件或文件夹路径")
    parser.add_argument("-l", "--level", choices=["low", "medium", "high"], default="medium", help="压缩级别")
    parser.add_argument("--dpi", type=int, default=150, help="图像目标 DPI")
    parser.add_argument("--quality", type=int, default=75, help="图像质量百分比")
    parser.add_argument("--remove-metadata", action="store_true", help="移除元数据")
    parser.add_argument("--remove-annotations", action="store_true", help="移除注释")
    parser.add_argument("--batch", action="store_true", help="是否批量处理文件夹中的 PDF")
    parser.add_argument("--threads", type=int, default=4, help="批量处理时的线程数")
    parser.add_argument("--smart", action="store_true", help="启用智能压缩模式")
    args = parser.parse_args()
    
    # 根据压缩级别设置默认参数
    if args.level == "low":
        args.dpi = max(args.dpi, 200)
        args.quality = max(args.quality, 90)
    elif args.level == "high":
        args.dpi = min(args.dpi, 100)
        args.quality = min(args.quality, 60)
    
    print(f"压缩设置: DPI={args.dpi}, 质量={args.quality}%, "
          f"移除元数据={args.remove_metadata}, 移除注释={args.remove_annotations}, "
          f"智能模式={args.smart}")
    
    if args.batch:
        batch_compress(args.input, args.output, args.dpi, args.quality, args.remove_metadata, args.remove_annotations, args.smart, args.threads)
    else:
        compress_pdf(args.input, args.output, args.dpi, args.quality, args.remove_metadata, args.remove_annotations, args.smart)

if __name__ == "__main__":
    main()