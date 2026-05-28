from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


app = FastAPI(title="FashionHub Chatbot", version="0.1.0")


class ChatIn(BaseModel):
    provider: str
    apiKey: str
    message: str
    backendBaseUrl: str


class ChatOut(BaseModel):
    provider: str
    answer: str


@dataclass
class Product:
    id: Optional[int]
    name: str
    slug: Optional[str]
    price: Optional[float]
    description: Optional[str]


async def fetch_products(backend_base_url: str, limit: int = 50) -> list[Product]:
    url = backend_base_url.rstrip("/") + "/api/products"
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(url)
        r.raise_for_status()
        payload = r.json()

    data = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(data, list):
        return []

    out: list[Product] = []
    for x in data[:limit]:
        if not isinstance(x, dict):
            continue
        out.append(
            Product(
                id=x.get("id"),
                name=str(x.get("name") or ""),
                slug=x.get("slug"),
                price=x.get("price"),
                description=x.get("description"),
            )
        )
    return out


def build_context(message: str, products: list[Product], top_k: int = 6) -> str:
    q = message.lower().strip()
    if not q or not products:
        return ""

    terms = [t for t in q.replace("?", " ").replace(",", " ").split() if len(t) >= 3]
    if not terms:
        return ""

    scored: list[tuple[int, Product]] = []
    for p in products:
        hay = (p.name + " " + (p.description or "")).lower()
        score = sum(1 for t in terms if t in hay)
        if score > 0:
            scored.append((score, p))

    scored.sort(key=lambda x: x[0], reverse=True)
    top = [p for _, p in scored[:top_k]]
    if not top:
        return ""

    lines = [
        "Dữ liệu sản phẩm liên quan (tham khảo để trả lời chính xác, không bịa):",
    ]
    for p in top:
        price = f"{int(p.price):,}đ" if isinstance(p.price, (int, float)) else ""
        slug = p.slug or ""
        lines.append(f"- {p.name} {price} (slug: {slug})")

    return "\n".join(lines)


async def call_gemini(api_key: str, prompt: str) -> str:
    try:
        import google.generativeai as genai
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini dependency error: {e}")

    genai.configure(api_key=api_key)
    model_name = "gemini-1.5-flash"
    try:
        model = genai.GenerativeModel(model_name)
        res = model.generate_content(prompt)
        return (getattr(res, "text", None) or "").strip()
    except Exception:
        # Fallback model
        try:
            model = genai.GenerativeModel("gemini-1.5-pro")
            res = model.generate_content(prompt)
            return (getattr(res, "text", None) or "").strip()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gemini call failed: {e}")


async def call_openai(api_key: str, prompt: str) -> str:
    try:
        from openai import OpenAI
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI dependency error: {e}")

    client = OpenAI(api_key=api_key)
    model = "gpt-4o-mini"
    try:
        r = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "Bạn là trợ lý CSKH cho shop thời trang. Trả lời ngắn gọn, đúng trọng tâm, tiếng Việt. Nếu không chắc, hãy hỏi thêm hoặc nói không có thông tin.",
                },
                {"role": "user", "content": prompt},
            ],
        )
        return (r.choices[0].message.content or "").strip()
    except Exception:
        # Fallback model
        try:
            r = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "Bạn là trợ lý CSKH cho shop thời trang. Trả lời tiếng Việt.",
                    },
                    {"role": "user", "content": prompt},
                ],
            )
            return (r.choices[0].message.content or "").strip()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"OpenAI call failed: {e}")


@app.get("/health")
async def health() -> dict[str, Any]:
    return {"ok": True}


@app.post("/chat", response_model=ChatOut)
async def chat(payload: ChatIn) -> ChatOut:
    provider = (payload.provider or "").strip().lower()
    if provider not in {"gemini", "openai"}:
        raise HTTPException(status_code=400, detail="provider must be gemini or openai")

    if not payload.apiKey or not payload.apiKey.strip():
        raise HTTPException(status_code=400, detail="apiKey is required")
    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="message is required")
    if not payload.backendBaseUrl or not payload.backendBaseUrl.strip():
        raise HTTPException(status_code=400, detail="backendBaseUrl is required")

    products: list[Product] = []
    try:
        products = await fetch_products(payload.backendBaseUrl)
    except Exception:
        products = []

    ctx = build_context(payload.message, products)

    prompt = "\n\n".join(
        [
            ctx,
            "Câu hỏi của khách hàng:",
            payload.message.strip(),
            "\nYêu cầu:",
            "- Ưu tiên trả lời dựa trên dữ liệu sản phẩm được cung cấp.",
            "- Không bịa thông tin (giá, chất liệu, tồn kho...). Nếu thiếu dữ liệu thì nói rõ.",
        ]
    ).strip()

    if provider == "gemini":
        answer = await call_gemini(payload.apiKey.strip(), prompt)
    else:
        answer = await call_openai(payload.apiKey.strip(), prompt)

    return ChatOut(provider=provider, answer=answer)
