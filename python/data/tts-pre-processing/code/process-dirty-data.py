
# Func: 读取文件内容，提取重复率较高 关键词， 使用关键词匹配文本后投喂给大模型生成文本

import re
import jieba
import random
from collections import Counter
from transformers import pipeline
from generate_medical_sentence import generate_medical_sentence_api
import os

# ------- config ------
targetPaths = [
# "/home/apple/Zayne/fine-turning-whisper-turbo/data/dirty/腹部和心脏1.csv",
# "/home/apple/Zayne/fine-turning-whisper-turbo/data/dirty/dirty-data-0508.csv",
"/home/apple/Zayne/fine-turning-whisper-turbo/data/dirty/肝肝肝.csv"
# "/home/apple/Zayne/fine-turning-whisper-turbo/data/dirty/乳腺.csv"
]

signMap = {
    "，",
    "。",
    "、",
    "；",
    "\n",
    ",",
    "mm",
    "m",
    "cm",
    "*",
    " ",
    "（",
    "）",
}
repeatFreq = 0

# ---------------------




def txt2basic_data(path):
    _lines = []
    word_counter = Counter()


    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        for line in lines:

            if line.strip() == "":
                continue
            line = re.sub(r'[、"；;:\：（）]','',line)
            line = re.sub(r'·','*',line)
            line = re.sub(r' ','',line)

            words = jieba.lcut(line)
            word_counter.update(words)
            _lines.append(line.strip())

    keys = word_counter.keys()
    fk = []
    for key in keys:
        con1 = key in signMap
        if con1:
            fk.append(key)
            continue
        con2 = re.sub(r'^\d?[\.\d]+$',"",key)
        if len(con2) == 0:
            fk.append(key)
            continue

        
    for k in fk:
        del(word_counter[k])
    
    high_frequency_words = {word for word, freq in word_counter.items() if freq > repeatFreq}

    words_prompt = {}

    for line in _lines:
        for word in high_frequency_words:
            if word in line:
                if word not in words_prompt:
                    words_prompt[word] = []
                words_prompt[word].append(line)
    

    return _lines,word_counter,words_prompt




generator = pipeline('text-generation', model='uer/gpt2-chinese-cluecorpussmall', max_length=30)


def generate_sentence(key, lr):
    numbers = list(range(len(lr)))
    fl = random.sample(numbers, 3) if len(lr) > 4 else [0]
    r = []
    for idx in fl:
        prompt = f"医学甲状腺报告总结：{lr[idx]}诊断为"
        # prompt = f"使用{lr[idx]}生成一句医学报告为"
        if len(prompt) > 200: continue
        res = generator(prompt, max_length=300, num_return_sequences=1, pad_token_id=50256,do_sample=True)
        txt = res[0]['generated_text'].replace(" ", "").replace(prompt, '').strip().split('。')[0] + '。'
        r.append(txt + '\n')

    return "".join(r)


# 通过大语言模型生成。
def generate_sentence_2(key, lr):
    numbers = list(range(len(lr)))
    fl = random.sample(numbers, 3) if len(lr) > 4 else [0]
    r = []
    # i = 0
    for idx in fl:
        # if i > 0: return "".join(r)
        # i+=1
        result = generate_medical_sentence_api(lr[idx],key)
        if result:
            print(f"生成的医学文本: {result['generated_text']}")
            r.append(result['generated_text'] + '\n')
        else:
            print("生成失败")  

    return "".join(r)



# 从原始文本提取句子
def extractSentencesFromOriginText(keyword, lr):
    numbers = list(range(len(lr)))
    fl = random.sample(numbers, 1) if len(lr) > 4 else [0]
    r = []
    for idx in fl:
        txt = lr[idx]
        r.append(txt + '\n')
    return "".join(r)

# Run:
if __name__ == "__main__":
    for itempath in targetPaths:
        basename=os.path.basename(itempath)
        line, counter, words = txt2basic_data(itempath)
        length = len(words.keys())
        puref = open("../clean/keyword-" + basename, "w")
        totalTxt = ""
        i=0
        for k in words:
            print(f"\033[36m关键词为： {k} [{i}/{length}]\033[0m")
            # 生成文本
            # txt = generate_sentence_2(k,words[k])
            i+=1
            # 提取原始文本
            # txt = extractSentencesFromOriginText(k, words[k])
            # print("\033[33m结果：   "+txt +"\033[0m")
            # if k in totalTxt:
            #     print("\033[31m重复了\033[0m")
            #     continue
            # totalTxt += txt + "\n"
            # print(txt) 
            puref.write(k + '\n')

