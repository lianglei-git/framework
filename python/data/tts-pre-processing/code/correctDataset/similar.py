import re
import math
from collections import Counter
import jieba
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# 1. 编辑距离（Levenshtein距离）
def levenshtein_distance(s1, s2):
    """计算两个字符串的编辑距离"""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    
    return previous_row[-1]

def levenshtein_similarity(s1, s2):
    """计算编辑相似度（0-1之间，值越大越相似）"""
    max_len = max(len(s1), len(s2))
    if max_len == 0:
        return 1.0
    return 1.0 - (levenshtein_distance(s1, s2) / max_len)

# 2. 余弦相似度（基于词频）
def get_word_vector(text):
    """将文本转换为词频向量"""
    words = re.findall(r'\w+', text.lower())
    return Counter(words)

def cosine_similarity_word_vector(v1, v2):
    """计算两个词频向量的余弦相似度"""
    intersection = set(v1.keys()) & set(v2.keys())
    numerator = sum([v1[x] * v2[x] for x in intersection])
    
    sum1 = sum([v1[x]**2 for x in v1.keys()])
    sum2 = sum([v2[x]**2 for x in v2.keys()])
    denominator = math.sqrt(sum1) * math.sqrt(sum2)
    
    if not denominator:
        return 0.0
    else:
        return float(numerator) / denominator

# 3. Jaccard相似度
def jaccard_similarity(s1, s2):
    """计算两个字符串的Jaccard相似度"""
    set1 = set(s1)
    set2 = set(s2)
    intersection = len(set1 & set2)
    union = len(set1 | set2)
    if union == 0:
        return 0.0
    return intersection / union

# 4. 基于TF-IDF的余弦相似度（适合长文本）
def tfidf_cosine_similarity(texts):
    """使用TF-IDF计算文本列表中两两之间的余弦相似度"""
    vectorizer = TfidfVectorizer(tokenizer=jieba.cut)
    tfidf_matrix = vectorizer.fit_transform(texts)
    similarity_matrix = cosine_similarity(tfidf_matrix, tfidf_matrix)
    return similarity_matrix

# 5. 基于词向量的相似度计算（需要预训练词向量模型）
def word_vector_similarity(s1, s2, word_vectors):
    """使用预训练词向量计算文本相似度"""
    def get_vector(text):
        vectors = []
        for word in jieba.cut(text):
            if word in word_vectors:
                vectors.append(word_vectors[word])
        if not vectors:
            return np.zeros(300)  # 默认300维向量
        return np.mean(vectors, axis=0)
    
    v1 = get_vector(s1)
    v2 = get_vector(s2)
    dot_product = np.dot(v1, v2)
    norm_v1 = np.linalg.norm(v1)
    norm_v2 = np.linalg.norm(v2)
    if norm_v1 == 0 or norm_v2 == 0:
        return 0.0
    return dot_product / (norm_v1 * norm_v2)

# 测试示例
if __name__ == "__main__":
    text1 = "甲状腺毒症伴毒性多结节性甲状腺肿需谨慎诊治"
    text2 = "甲状腺毒症、半毒性多结节性甲状腺肿需谨慎诊治"
    
    # 测试各种相似度计算方法
    print(f"编辑相似度: {levenshtein_similarity(text1, text2):.4f}")
    print(f"词频余弦相似度: {cosine_similarity_word_vector(get_word_vector(text1), get_word_vector(text2)):.4f}")
    print(f"Jaccard相似度: {jaccard_similarity(text1, text2):.4f}")
    
    # TF-IDF相似度（需要多个文本）
    texts = [text1, text2, "肺部结节良性可能性大"]
    similarity_matrix = tfidf_cosine_similarity(texts)
    print(f"TF-IDF余弦相似度矩阵:\n{similarity_matrix}")
    
    # 词向量相似度（示例，需要实际加载词向量模型）
    # word_vectors = load_word_vectors()  # 假设已加载词向量
    # print(f"词向量相似度: {word_vector_similarity(text1, text2, word_vectors):.4f}")    