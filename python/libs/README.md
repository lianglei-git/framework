# lib

Agent 公共基础设施。

## LLM


```python
from lib.llm import get_client, is_llm_available, LLMConfig

if is_llm_available():
    client = get_client()
    text = client.chat("...")
    data = client.chat_json("...")
```
