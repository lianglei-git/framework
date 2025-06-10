import requests
import json
import random

def generate_medical_sentence_api(prompt,keywords: str) -> dict | None:
    """
    通过大语言模型生成医用文本
    
    Args:
        keywords: 用于生成文本的关键词
    
    Returns:
        包含生成文本的字典，或在出错时返回None
    """
    obj = {
        "origin_text": keywords,
        "generated_text": "",
        "generated_text_list": []
    }
    
    try:
        response = requests.post(
            "http://10.2.112.102:9998/v1/chat/completions",
            headers={
                "Content-Type": "application/json"
            },
            json={
                "model": "qwen_2_5",
                "messages": [
                    {
                        "role": "user",
                        "content": f"参考文本“{prompt}”，然后使用关键词“{keywords}”生成一段诊断医学范畴内的短句，长度在40字以内，并且包含关键字。"
                    }
                ],
                "temperature": 0.7
            }
        )
        
        # 检查响应状态码
        response.raise_for_status()
        
        data = response.json()
        
        if "choices" in data:
            obj["generated_text_list"] = [item["message"]["content"] for item in data["choices"]]
            obj["generated_text"] = obj["generated_text_list"][0]
            
        # print(obj["generated_text"])
        return obj
        
    except Exception as error:
        print(f"Error: {error}")
        return None

# 示例调用
if __name__ == "__main__":
    result = generate_medical_sentence_api("甲状腺结节")
    if result:
        print(f"生成的医学文本: {result['generated_text']}")
    else:
        print("生成失败")    