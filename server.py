"""
感情分析ウィジェット - FastAPI バックエンド
Claude APIのビジョン機能で表情から感情を解析する
"""

import base64
import json
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import anthropic

app = FastAPI(title="感情分析ウィジェット API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


class AnalyzeRequest(BaseModel):
    image: str  # base64エンコードされた画像
    media_type: str = "image/jpeg"


EMOTION_PROMPT = """この画像に写っている人物の表情を詳細に分析してください。

以下のJSON形式で回答してください。コードブロックや余分なテキストは一切含めないでください:

{
  "emotions": {
    "happy": 0.0,
    "sad": 0.0,
    "angry": 0.0,
    "surprised": 0.0,
    "fearful": 0.0,
    "disgusted": 0.0,
    "neutral": 0.0
  },
  "dominant_emotion": "happy",
  "description": "表情の説明（日本語、2文程度）",
  "face_detected": true,
  "confidence": 0.9
}

ルール:
- emotions の各値は 0.0〜1.0 の小数で、合計が 1.0 になるようにする
- dominant_emotion は最も高いスコアの感情キーを入れる
- 顔が検出できない場合は face_detected を false にして全感情を 0 にする
- confidence は解析の確信度（0.0〜1.0）
- description は日本語で表情・感情の具体的な説明を書く"""


@app.post("/analyze")
async def analyze_emotion(request: AnalyzeRequest):
    try:
        # base64データからプレフィックスを除去
        image_data = request.image
        if "," in image_data:
            image_data = image_data.split(",")[1]

        with client.messages.stream(
            model="claude-opus-4-6",
            max_tokens=512,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": request.media_type,
                                "data": image_data,
                            },
                        },
                        {"type": "text", "text": EMOTION_PROMPT},
                    ],
                }
            ],
        ) as stream:
            response_text = stream.get_final_message().content[0].text.strip()

        # JSONをパース
        result = json.loads(response_text)
        return result

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"JSON解析エラー: {str(e)}")
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"Claude APIエラー: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {"status": "ok"}


# 静的ファイルの配信
app.mount("/js", StaticFiles(directory="js"), name="js")
app.mount("/static", StaticFiles(directory="."), name="static")


@app.get("/")
async def root():
    return FileResponse("index.html")


@app.get("/{filename}")
async def serve_file(filename: str):
    if filename.endswith((".css", ".js", ".html")):
        return FileResponse(filename)
    raise HTTPException(status_code=404)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
