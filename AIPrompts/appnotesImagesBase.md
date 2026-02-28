i to, zeby robił post produkcje na automacie

import OpenAI from "openai";
import fs from "fs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const img = await openai.images.generate({
model: "gpt-image-1.5",
prompt: "A premium studio product photo of a metal enamel pin on a pure white background",
size: "1024x1024",
quality: "high",
});

const b64 = img.data[0].b64_json; // GPT image models return base64
fs.writeFileSync("image.png", Buffer.from(b64, "base64"));

--
import OpenAI from "openai";
import fs from "fs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const resp = await openai.responses.create({
model: "gpt-5.2",
input: "Generate an image of a gray tabby cat hugging an otter with an orange scarf",
tools: [{ type: "image_generation" }],
// tool_choice: { type: "image_generation" }, // uncomment to FORCE image generation
});

const imageBase64 = resp.output
.filter((o) => o.type === "image_generation_call")
.map((o) => o.result)[0];

fs.writeFileSync("result.png", Buffer.from(imageBase64, "base64"));

--
