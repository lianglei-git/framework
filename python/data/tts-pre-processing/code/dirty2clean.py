import re
import pandas as pd

def clean_text(text):
    text = remove_punctuation_before_chinese(text)  # 去除中文前的标点符号
    if len(text) < 4:
        return None

    text = text.replace('·', '*')
    # 去除特殊字符（保留中文、英文、数字和基础标点）
    text = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9，*\.。；：？！、（）%]', '', text)
    
    # 标准化标点
    text = text.replace('，', ',').replace('、', ',').replace('：', ',').replace('；', ',').replace('-', ',')
    
    # 去除连续空格
    text = re.sub(r'\s+', ' ', text).strip()

    text = remove_parentheses(text)  # 移除括号及其内容
   
    
    return text




def remove_parentheses(text):
    """移除文本中所有括号及其内部的内容"""
    # 匹配各种括号及其内容：(...)、（...）、[...]、【...】、<...>、{...}
    pattern = r'[\(\（\[\【\{<].*?[\)\）\]\】\}>]'
    return re.sub(pattern, '', text)


def remove_punctuation_before_chinese(text):
    """demo
        text = ";、，性别特"
        cleaned_text = remove_punctuation_before_chinese(text)
        print(cleaned_text)  # 输出: "性别特" 
    """

    """
    去除中文文本中首个中文字符之前的所有标点符号
    :param text: 输入的文本
    :return: 处理后的文本
    """
    # 使用正则表达式匹配首个中文字符的位置
    match = re.search(r'[\u4e00-\u9fff]', text)
    if match:
        first_chinese_index = match.start()
        # 保留首个中文字符及之后的内容
        return text[first_chinese_index:]
    else:
        # 如果文本中没有中文字符，返回原文本
        return text



# 针对 “病灶大小约为1mx7.5m，位于乳头外约45cm处，距体表约4.1cm。”
# 这种数据中的 数字+m 转换成 数字+mm