// 用已有音频重新提交 avatar4，指定头像路径
import { loadConfig } from "../utils/config.js";
import { TopviewClient } from "../utils/topview.js";
import path from "path";

const config = loadConfig();
const topview = new TopviewClient(config.topviewScriptsDir);
const boardId = await topview.getBoardId();

const audioPath = path.resolve("public/tts/main.mp3");
const avatarPath = process.argv[2] === "--styled"
  ? path.resolve("public/avatar-styled.jpg")
  : config.avatarPhotoPath;

console.log(`Submitting avatar4 with: ${avatarPath}`);
const taskId = await topview.submitAvatar4WithAudio(
  audioPath, avatarPath, boardId, config.captionId || undefined
);
console.log("TaskId:", taskId);
