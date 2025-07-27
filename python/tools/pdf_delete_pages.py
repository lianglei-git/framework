# pip install pymupdf
# 删除pdf指定页数

import fitz
import re
import argparse
from pathlib import Path

def parse_page_range(page_range_str):
    """
    解析页面范围字符串，支持格式如 "3", "2-5", "1,3,5-7"
    返回排序后的唯一页面列表（从0开始索引）
    """
    pages = set()
    for part in page_range_str.split(','):
        if '-' in part:
            a, b = part.split('-')
            pages.update(range(int(a) - 1, int(b)))  # PDF页面从1开始，转换为从0开始
        else:
            pages.add(int(part) - 1)  # 转换为从0开始的索引
    return sorted(pages)

def delete_pages(input_pdf, output_pdf, pages_to_delete):
    """
    从PDF中删除指定页面
    
    参数:
        input_pdf: 输入PDF文件路径
        output_pdf: 输出PDF文件路径
        pages_to_delete: 要删除的页面列表（从0开始索引）
    """
    # 打开PDF文档
    doc = fitz.open(input_pdf)
    
    # 计算要保留的页面
    all_pages = set(range(len(doc)))
    pages_to_keep = sorted(all_pages - set(pages_to_delete))
    
    # 检查是否有页面可保留
    if not pages_to_keep:
        print("错误：所有页面都被删除，无法创建空PDF。")
        return False
    
    # 创建新PDF并复制保留的页面
    new_doc = fitz.open()
    for page_num in pages_to_keep:
        new_doc.insert_pdf(doc, from_page=page_num, to_page=page_num)
    
    # 保存新PDF
    new_doc.save(output_pdf)
    new_doc.close()
    doc.close()
    return True

def main():
    parser = argparse.ArgumentParser(description='删除PDF中的指定页面')
    parser.add_argument('-i', '--input', required=True, help='输入PDF文件路径')
    parser.add_argument('-o', '--output', help='输出PDF文件路径，默认为"原文件名_删除页.pdf"')
    parser.add_argument('-p', '--pages', required=True, 
                        help='要删除的页面范围，支持格式如 "3", "2-5", "1,3,5-7"')
    args = parser.parse_args()
    
    # 解析页面范围
    try:
        pages_to_delete = parse_page_range(args.pages)
    except Exception as e:
        print(f"错误：页面范围解析失败 - {str(e)}")
        print("请使用正确的格式，如 '3', '2-5', '1,3,5-7'")
        return
    
    # 处理输出文件路径
    input_path = Path(args.input)
    if not args.output:
        output_path = input_path.parent / f"{input_path.stem}_删除页{input_path.suffix}"
    else:
        output_path = Path(args.output)
    
    # 检查输入文件是否存在
    if not input_path.exists():
        print(f"错误：输入文件 '{input_path}' 不存在")
        return
    
    # 执行删除操作
    if delete_pages(str(input_path), str(output_path), pages_to_delete):
        print(f"成功删除页面 {[p+1 for p in pages_to_delete]}")  # 转换回1-based显示
        print(f"新文件已保存至 '{output_path}'")

if __name__ == "__main__":
    main()


# python pdf_delete_pages.py -i input.pdf -p 3
# python pdf_delete_pages.py -i input.pdf -p 2-5
# python pdf_delete_pages.py -i input.pdf -p 1,3,5-7
# python pdf_delete_pages.py -i input.pdf -o output.pdf -p 1,5


# python pdf_delete_pages.py -i /Users/sparrow/Documents/25民法钟秀勇精讲.pdf -o output.pdf -p 0-299,516-675