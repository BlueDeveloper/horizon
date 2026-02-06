import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // 'home', 'exterior', 'interior'

  try {
    let dirPath: string;

    switch (type) {
      case "home":
        dirPath = path.join(process.cwd(), "public", "images", "home");
        break;
      case "exterior":
        dirPath = path.join(process.cwd(), "public", "images", "exterior");
        break;
      case "interior":
        dirPath = path.join(process.cwd(), "public", "images", "interior");
        break;
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // 디렉토리가 존재하는지 확인
    if (!fs.existsSync(dirPath)) {
      return NextResponse.json({ error: "Directory not found" }, { status: 404 });
    }

    // 디렉토리 내 파일 읽기
    const files = fs.readdirSync(dirPath);

    // 이미지 파일만 필터링 (jpg, jpeg, png, webp)
    const imageFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return [".jpg", ".jpeg", ".png", ".webp"].includes(ext);
    });

    // 전체 경로로 변환
    const imagePaths = imageFiles.map((file) => `/images/${type}/${file}`);

    return NextResponse.json({ images: imagePaths });
  } catch (error) {
    console.error("Error reading directory:", error);
    return NextResponse.json(
      { error: "Failed to read directory" },
      { status: 500 }
    );
  }
}
