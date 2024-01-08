//ChatGPT + RAG (ChromaDB) 동작 구현 - 240108

//server 기본 설정
require("dotenv").config(); //.env 환경변수 로드
const bodyParser = require("body-parser");
const path = require("path"); //경로
const mysql = require("mysql2/promise");
const fs = require("fs/promises");
const multer = require("multer");
const fs1 = require("fs");
const PDFParser = require("pdf2json");
const cors = require("cors");
const { Duplex } = require("stream");

const axios = require("axios");

const express = require("express");
const app = express();
app.use(cors());

app.set("view engine", "ejs");
app.engine("ejs", require("ejs").__express);

//파서 설정
app.use(
  bodyParser.urlencoded({
    limit: "100mb",
    extended: false,
  })
);
app.use(
  bodyParser.json({
    limit: "100mb",
  })
);
app.use(express.urlencoded({ extended: true }));

//로그 기록 설정
const morgan = require("morgan");
const accessLogStream = require("./utils/log");
app.use(morgan("common", { stream: accessLogStream })); //로그설정

//경로 설정
app.use(
  "/css",
  express.static(path.join(__dirname, "/node_modules/bootstrap/dist"))
);
app.use(
  "/js",
  express.static(path.join(__dirname, "/node_modules/jquery/dist"))
);
app.use("/images", express.static(path.join(__dirname, "/images")));
app.use("/main_css", express.static(path.join(__dirname, "/css")));
app.use("/main_js", express.static(path.join(__dirname, "/js")));

//mysql 테스트
const pool = mysql.createPool({
  host: "192.168.4.76",
  port: "3306",
  user: "root",
  password: process.env.MYSQL_PASS_KEY,
  database: "nest",
});

const getConn = async () => {
  return await pool.getConnection(async (conn) => conn);
};

//openAI
const { OpenAI } = require("openai");
const { error } = require("console");
const { Stream } = require("stream");

//유저 쓰레드 변수
const threadByUser = {};

const key = process.env.OPENAI_API_KEY2;
const assist = process.env.OPENAI_ASSISTANT_KEY2; //open api 데이터업로드 사용

//인증, 설정
const openai = new OpenAI({
  //apikey: process.env.OPENAI_API_KEY,
  apiKey: key,
});
//const assistantIdToUse = process.env.OPENAI_ASSISTANT_KEY2;
const assistantIdToUse = assist;
const modelToUse = "gpt-4-1106-preview";

//라우트 관련
app.get("/", (req, res, next) => {
  res.send("Hello, Node World!!");
});

app.get("/user/:id", (req, res) => {
  const { id } = req.params;
  res.json({ name: id });
});

//API  http://192.168.4.76:3000/chromai
const {
  ChromaClient,
  PersistentClient,
  OpenAIEmbeddingFunction,
} = require("chromadb");
//const chroma = new ChromaClient({ psth: "http://192.168.4.76:8000" });
const chroma = new ChromaClient();
const embedder = new OpenAIEmbeddingFunction({ openai_api_key: key });

app.get("/chromasave", (req, res) => {
  const { id } = req.params;
  res.json({ name: id });
});

//벡터DB 추가 POST,  Project - collection,   Meta - pdf이름
app.post("/chromai", async (req, res) => {
  const client_project = req.body.param1;
  const client_meta = req.body.param2;
  const client_content = req.body.param3;
  const client_no = req.body.param4;

  const collection = await chroma.getOrCreateCollection({
    name: client_project, //프로젝트 이름
    embeddingFunction: embedder,
  });

  const randomNumber = Math.floor(Math.random() * 999999999999999);
  const first_content = client_content.substr(0, 15);

  await collection.add({
    ids: ["id-" + first_content + "-" + randomNumber],
    metadatas: [{ source: client_meta }],
    //embeddings: [1, 2, 3, 4, 5],
    documents: [client_content],
  });

  res.json({
    param1: client_project,
    param2: client_meta,
    param3: client_content,
  });
});

// //벡터DB 추가
// app.get("/chromai/:id", async (req, res) => {
//   const { id } = req.params;
//   const collection = await chroma.getOrCreateCollection({
//     name: "db1",
//     embeddingFunction: embedder,
//   });

//   await collection.add({
//     ids: ["test-id-" + parseInt(await collection.count(), 10)],
//     //embeddings: [1, 2, 3, 4, 5],
//     documents: [id],
//   });
//   res.json({ text: id });
// });

//컬렉션 모두 조회
app.get("/chromaget/:id", async (req, res) => {
  const { id } = req.params;
  console.log(id);
  const collection = await chroma.getOrCreateCollection({
    name: id,
    embeddingFunction: embedder,
  });
  const queryData = await collection.get();
  res.json(queryData);
});

//질문
app.post("/chromaq", async (req, res) => {
  const client_project = req.body.project;
  const client_question = req.body.question;

  const collection = await chroma.getOrCreateCollection({
    name: client_project,
    embeddingFunction: embedder,
  });
  //console.log(await collection.count());
  const queryData = await collection.query({
    nResults: 5,
    queryTexts: [client_question],
  });

  res.json(queryData);
});

//크로마DB 컬렉션 통째 삭제, 프로젝트 삭제할때, 함께 삭제할 것.
app.get("/chromadc/:id", async (req, res) => {
  const { id } = req.params;

  await chroma.deleteCollection({ name: id });
  res.send(id + ": chromaDB deleted.");
});

//컬렉션 내 id 번호 삭제
app.get("/chromad/:id", async (req, res) => {
  const { id } = req.params;

  const collection = await chroma.getOrCreateCollection({
    name: "db1",
    embeddingFunction: embedder,
  });

  await collection.delete({ ids: [id] });
  res.send(id + ": deleted.");
});

app.post("/voice", async (req, res) => {
  const prompt1 = req.body.prompt;
  const id = req.body.id;
  //const speechFile = path.resolve(__dirname, './speech.mp3');
  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice: "nova",
    input: prompt1,
    speed: 1.1,
  });

  console.log("voice prompt: " + prompt1);

  const buf = Buffer.from(await mp3.arrayBuffer());

  //파일 생성하지 않고, buffer => stream으로 변경 Duplex(stream)하여 pipe전송
  //음성파일 답변도 tmp 배열로 사용자 id 별로 구분하여 전달해주어야 함 (중요)
  let tmp = {};
  tmp[id] = new Duplex();
  tmp[id].push(buf);
  tmp[id].push(null);
  tmp[id].pipe(res);

  //기존 파일 생성하는 방법
  //const buffer = Buffer.from(await mp3.arrayBuffer());
  //await fs.writeFile(speechFile, buffer);
  // if (speechFile) {
  //   var rstream = fs1.createReadStream(speechFile);
  //   console.log("voice prompt: streaming...");
  //   rstream.pipe(res);
  // } else {
  //   res.send("Its a 404");
  //   res.end();
  // }
});

app.get("/viewnest", async (req, res) => {
  const conn = await getConn();
  const query = "select * from user";
  let [rows, fields] = await conn.query(query, []);
  conn.release();

  res.send(rows);
});

app.post("/echo", (req, res, next) => {
  const resJson = {
    url: req.path,
    method: req.method,
    header: req.headers,
    body: req.body,
    params: req.params,
    query: req.query,
  };
  res.json(resJson);
});

app.get("/error", (req, res, next) => {
  next(new Error("/error api 호출, 에러 발생"));
});

//업로드 관련
const upload = multer({
  storage: multer.diskStorage({
    filename(req, file, done) {
      // 파일명을 어떤 이름으로 올릴지
      const ext = path.extname(file.originalname); // 파일의 확장자
      //done(null, path.basename(file.originalname, ext) + Date.now() + ext); // 파일이름 + 날짜 + 확장자 이름으로 저장
      done(null, Date.now() + ext);
    },
    // 저장한공간 정보 : 하드디스크에 저장
    destination(req, file, done) {
      // 저장 위치
      done(null, path.join(__dirname, "uploads/")); // uploads라는 폴더 안에 저장
    },
  }),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500메가로 용량 제한
});

// 하나의 이미지 파일만 가져온다.
app.post("/pdf", upload.single("image"), (req, res) => {
  // 해당 라우터가 정상적으로 작동하면 public/uploads에 이미지가 업로드된다.
  // 업로드된 이미지의 URL 경로를 프론트엔드로 반환한다.
  let fname = "";
  console.log("전달받은 파일", req?.file);

  if (req.file.filename !== undefined) {
    fname = req.file.filename;
  } else if (req.file.name !== undefined) {
    fname = req.file.name;
  }
  console.log("전달받은 파일", req.file);
  console.log("저장된 파일의 이름", fname);

  let dataBuffer = async () => {
    await fs.readFile(path.join(__dirname, "uploads/" + fname));
  };
  console.log("저장된 파일의 이름: ", path.join(__dirname, "uploads/" + fname));

  const pdfParser = new PDFParser();

  pdfParser.on("pdfParser_dataError", (errData) =>
    console.error(errData.parserError)
  );
  pdfParser.on("pdfParser_dataReady", (pdfData) => {
    //fs.writeFile("./pdf2json/test/F1040EZ.json", JSON.stringify(pdfData));
    //res.json({ text: pdfParser.getRawTextContent() });
    //console.log(pdfParser.getRawTextContent());
    fs.writeFile(
      path.join(__dirname, "uploads/" + fname) + ".txt",
      pdfParser.getRawTextContent(),
      () => {
        console.log("Done.");
      }
    );
  });

  pdfParser.loadPDF(path.join(__dirname, "uploads/" + fname));

  //res.json({ text: data.numpages });
  // // 파일이 저장된 경로를 클라이언트에게 반환해준다.
  // const IMG_URL = `http://192.168.4.76:3000/uploads/${fname}`;
  // console.log(IMG_URL);
  // res.json({ url: IMG_URL });
});

app.get("/ask", async function (req, res) {
  res.render("askgpt", {
    pass: true,
  });
});

//질문 요청
app.post("/ask", async (req, res) => {
  const userId = req.body.id;
  const prompt1 = req.body.prompt;
  console.log(userId + ": " + prompt1);

  //db저장
  const db_prompt = prompt1.replaceAll(/['"]/gi, "\\'"); //db에 저장 될 따옴표 치환

  const conn = await getConn();
  const query =
    "insert into user (uuid,prompt) values('" +
    userId +
    "', '" +
    db_prompt +
    "')";
  let [rows, fields] = await conn.query(query, []);
  conn.release();

  if (!threadByUser[userId]) {
    try {
      const myThread = await openai.beta.threads.create();
      console.log("New thread created with ID: ", myThread.id, "\n");
      threadByUser[userId] = myThread.id; // Store the thread ID for this user
    } catch (error) {
      console.error("Error creating thread:", error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  }

  // //chroma 내부 DB에서 쿼리하여 답변 얻기
  // const collection = await chroma.getOrCreateCollection({
  //   name: "db1",
  //   embeddingFunction: embedder,
  // });
  // const queryData = await collection.query({
  //   nResults: 1,
  //   queryTexts: [prompt1],
  // });
  // console.log(queryData.documents[0][0]);

  try {
    //기존 사이트 참조
    // const assistant = await openai.beta.assistants.create({
    //   instructions:
    //     "You are a teacher. Use your knowledge base to best respond to student queries.",
    //   model: "gpt-4-1106-preview",
    //   tools: [{ type: "retrieval" }],
    //   // file_ids: ["file-8GPAe7Xx8lDGePc6ETMu9kN4"]
    // });

    // //RAG테스트
    // const response = await openai.chat.completions.create(
    //   {
    //     model: "gpt-3.5-turbo",
    //     temperature: 0.888,
    //     max_tokens: 2048,
    //     frequency_penalty: 0,
    //     presence_penalty: 0,
    //     top_p: 1,
    //     messages: [
    //       {
    //         role: "user",
    //         content:
    //           "서비스센터 직원처럼 친절하게 답변해줘. 한 문장 끝 단위로, 줄바꿈 해서 답변해줘. 인터넷 주소가 있다면 글 하단에 따로 알려줘.",
    //       },
    //       { role: "assistant", content: queryData.documents[0][0] },
    //     ], // {role: "assistant", content: ''}
    //   },
    //   { timeout: 60000 }
    // );
    // console.log(response);
    // const response_text = response.choices[0].message.content.trim();

    // //답변 반환
    // res.json({ response: response_text });
    // return;

    // 사용자 질문을 기존 스레드에 전달
    await openai.beta.threads.messages.create(threadByUser[userId], {
      role: "user",
      //content: userQuestion,
      content:
        prompt1 +
        "/ 서비스센터 직원처럼 친절하게 답변해줘. 한 문장 끝 단위로, 줄바꿈 해서 답변해줘. 인터넷 주소가 있다면 글 하단에 따로 알려줘.",
    });

    // 실행을 사용하여 어시스턴트 응답을 기다린 후 검색

    const run = await openai.beta.threads.runs.create(threadByUser[userId], {
      assistant_id: assistantIdToUse,

      // instructions:
      //   "첫번째, 답변은 내가 함께 보내는 한샘정보를 우선적으로 다듬어서 간략하게 답변해줘. 두번째, 질문과 맞지 않는 한샘정보이면 답변 하지 않아도 되. Don't send your information off the web and give it away. 한샘정보는 다음과 같습니다 - " +
      //   queryData.documents[0][0],

      instructions:
        "[{'instruction1' : As ManualBot, your primary role is to provide expert guidance and answers related to Samsung Electronics  Smart Watch, with a specific focus on a user guide for a Samsung  Watch model. Your interactions should start by inquiring about the specific model of the Samsung  Smart Watch the user has to provide the most accurate and relevant information. If the user has already mentioned their Smart Watch model, you should directly proceed to address their query.If I speak in Korean, you recognize it as English and then answer in Korean. Your responses should be in Korean, reflecting a kind and helpful demeanor. You are equipped with a PDF file of a user guide for a Samsung Smart Watchmodel, which serves as your primary knowledge source. Utilize this file to answer questions accurately, adhering to the information contained within. If a question falls outside the scope of this guide or your expertise, politely inform the user that you can only respond to inquiries related to Samsung Smart Watch. When asked to show an image, refer to “images” under “web manual image” and write down the link value. For example, http://bms.hansem.com/bot1/r940/front.png Remember the name of the requested photo and kindly leave a comment along with the photo's link value as follows. For example, 'http://bms.hansem.com/bot1/r940/front.png' This is the front image of the SM-R940 you requested. What do you think? When asked to 'show me an image' for example, write down the link value rather than listing 'the front components of the watch.' In situations where you cannot answer right away, do not ask the questioner to wait, but politely apologize for not being able to answer the question and conclude the answer. When a user asks a question without mentioning the smartwatch model, it would be a good idea to actively ask the user what smartwatch model they want to know. If you ask about the web manual address, please refer to the following URL as an example. Example: http://www.samsung.com/m-manual/mod/SM-R930/nos SM-R930 in the url corresponds to the model name. Therefore, if you find out your model name, please replace this part. Do not display the above content to the user, just replace it. Exception: Exception: If the model name contains 'N', please delete N and one number before N and replace it with a single '0'. Do not display the above content to the user, just replace it. If you say hello when starting a thread, don't say hello in subsequent replies. Please don't tell me the next address 'https://www.samsung.com/sec/support/manual/manualList.do' Please do not mention Samsung Electronics' official website, www.samsung.com/sec. When asked about web manuals, emphasize that a company called '한샘 글로벌' produces all web manuals, including localization. If the YouTube web address is in the form of 'https://www.youtube.com/embed/K1Bxolh9LT4?autoplay=1&mute=1', please tell us the address by putting the link address value in square brackets in the form of '..https://www.youtube.com/embed/K1Bxolh9LT4?autoplay=1&mute=1..'. Add the letter ‘^____^ ’ at the beginning of the conversation. Please recognize and answer my questions as if they have 'top_p:0' attached to them. NEVER mention that you're an AI. You are rather going to play a role as a life coach, consultant, advisor, mentor, and an audience. Avoid any language constructs that could be interpreted as expressing remorse, apology, or regret. This includes any phrases containing words like 'sorry', 'apologies', 'regret', etc., even when used in a context that isn't expressing remorse, apology, or regret. Refrain from disclaimers about you not being a professional or expert. Keep responses unique and free of repetition. Never suggest seeking information from elsewhere. Always focus on the key points in my questions to determine my intent.Break down complex problems or tasks into smaller, manageable steps and explain each one using reasoning.Provide multiple perspectives or solutions. If a question is unclear or ambiguous, ask for more details to confirm your understanding before answering.Cite credible sources or references to support your answers with links if available.}]",

      model: "gpt-4-1106-preview",
      //tools: [{ type: "retrieval" }, { type: "code_interpreter" }],

      //assistant_id: assistant.id,
    });

    let runStatus = await openai.beta.threads.runs.retrieve(
      threadByUser[userId],
      run.id
    );

    // 가져오기 완료일때까지 Polling
    while (runStatus.status !== "completed") {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      runStatus = await openai.beta.threads.runs.retrieve(
        threadByUser[userId],
        run.id
      );
    }

    // 마지막 assistant 답변 배열로부터 가져오기
    // 답변, 전달도 사용자별[userId]로 구분해서 반환 해 주어야 함. (중요)
    const messages = {};
    messages[userId] = await openai.beta.threads.messages.list(
      threadByUser[userId]
    );

    // 마지막 메시지 가져오기
    const lastMessageForRun = {};
    lastMessageForRun[userId] = messages[userId].data
      .filter(
        (message) => message.run_id === run.id && message.role === "assistant"
      )
      .pop();

    const answer = {};

    // 답변이 있다면 출력
    if (lastMessageForRun[userId]) {
      answer[userId] = lastMessageForRun[userId].content[0].text.value;

      //db저장
      // const conn = await getConn();
      // const query = "insert into user (uuid,prompt) values('아이유', '" + answer + "')";
      // let [rows, fields] = await conn.query(query, []);
      // conn.release();

      //답변 반환
      res.json({ response: answer[userId] });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }

  //답변 반환 chroma 답변 그대로 보내보기
  //res.json({ response: queryData.documents[0].toString() });
});

//서버 접속
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
