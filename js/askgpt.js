//const { Threads } = require("openai/resources/beta/threads/threads");

$(function () {
  $("#sendBtn").on("click", function (event) {
    var msg = $("#msg").val();

    if (msg != "") {
      addToDiscussion("질문자", msg);
      send(msg);

      $("#msg").val("");
      $("#msg").focus();
    }
  });

  $("#model button").on("click", function (event) {
    //alert($(this).html());
    const msg = $(this).html() + " 모델에 대해 질문 있어요.";
    addToDiscussion("질문자", msg);
    send(msg);
  });
});

function submit_value(e) {
  if (e.keyCode == 13) {
    var msg = $("#msg").val();

    if (msg != "") {
      addToDiscussion("질문자", msg);
      send(msg);

      $("#msg").val("");
      $("#msg").focus();
    }
  }
}

function addToDiscussion(writer, msg) {
  var contents =
    "<li class='" +
    writer +
    " chat_me'>" +
    "<div class='message chat_ib'>" +
    "<p>" +
    writer +
    ": " +
    msg +
    "</p>" +
    "</div></li>";
  $(".discussion").append(contents);
  scrollTop(16);
}

function addToDiscussion2(writer, msg) {
  var today = new Date();
  var year = today.getFullYear();
  var month = ("0" + (today.getMonth() + 1)).slice(-2);
  var day = ("0" + today.getDate()).slice(-2);
  var hours = ("0" + today.getHours()).slice(-2);
  var minutes = ("0" + today.getMinutes()).slice(-2);
  var seconds = ("0" + today.getSeconds()).slice(-2);
  var timeString = year + month + day + hours + minutes + seconds;
  var timeString2 =
    year +
    "년 " +
    month +
    "월 " +
    day +
    "일 " +
    hours +
    ":" +
    minutes +
    ":" +
    seconds;

  var contents =
    "<li class='" +
    writer +
    " chat_bot'>" +
    "<div class='message chat_ib'>" +
    //+ "<p>" + writer + ": <span id='id_" + timeString + "'></span></p>"
    "<p><img src='images/iu.png' width='30' height='30'>: <span id='id_" +
    timeString +
    "'></span></p>" +
    "</div>" +
    "<div class='chat_time'><p><span id='id_time_" +
    timeString +
    "'></span></p></div>" +
    "</li>";
  $(".discussion").append(contents);

  //const $text = document.querySelector("#id_" + timeString + "");
  const speed = 30;
  let index = 0;
  var typingBool = false;

  const text = document.querySelector("#id_" + timeString);

  if (typingBool == false) {
    // 타이핑이 진행되지 않았다면
    typingBool = true;
    var tyInt = setInterval(typing, speed); // 반복동작
  }

  // 타이핑 효과
  function typing() {
    //console.log(typeof (msg[index]));
    if (msg[index] == "\n") {
      //alert("엔터발견");
      if (msg[index - 1] != null) {
        if (msg[index - 1] != "\n") text.innerHTML += "<br>";
        scrollTop(16);
      }
      index++;
    } else if (msg[index] == null) {
      index++;
    } else {
      text.innerHTML += msg[index++];
      scrollTop(16);
    }

    if (index > msg.length) {
      //끝나면 반복종료
      clearInterval(tyInt);
      index = 0;

      //사진 주소인 경우
      if (msg.indexOf("http") != -1 && msg.indexOf(".png") != -1) {
        var userPatterns = {
          email:
            /(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/g,
          url: /(http(s)?:\/\/|www.)([a-z0-9\w]+\.*)+[a-z0-9]{2,4}([\/a-z0-9-%#?&=\w])+(\.[a-z0-9]{2,4}(\?[\/a-z0-9-%#?&=\w]+)*)*/gi,
        };

        var userReplaceFunctions = {
          url: function (_url) {
            return '<br><img style="max-width:99%" src="' + _url + '"><br>';
          },
        };
        text.innerHTML = text.innerHTML.replace(
          userPatterns["url"],
          userReplaceFunctions["url"]
        );
      }

      //웹 주소인 경우, png, youtube 없으면
      if (
        msg.indexOf("http") != -1 &&
        msg.indexOf(".png") == -1 &&
        msg.indexOf("youtube.com") == -1
      ) {
        var userPatterns = {
          email:
            /(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/g,
          url: /(http(s)?:\/\/|www.)([a-z0-9\w]+\.*)+[a-z0-9]{2,4}([\/a-z0-9-%#?&=\w])+(\.[a-z0-9]{2,4}(\?[\/a-z0-9-%#?&=\w]+)*)*/gi,
        };

        var userReplaceFunctions = {
          email: function (_email) {
            return '<a href="mailto:' + _email + '">' + _email + "</a>";
          },
          url: function (_url) {
            return '<a href="' + _url + '" target = "_blank">' + _url + "</a>";
          },
        };
        //text.innerHTML = msg.replace("\n", "<br>");
        text.innerHTML = text.innerHTML.replace(
          userPatterns["url"],
          userReplaceFunctions["url"]
        );
      }

      //동영상 유튜브 웹주소인 경우,  https, youtube 있으면
      if (msg.indexOf("https") != -1 && msg.indexOf("youtube.com") != -1) {
        var userPatterns = {
          url: /\.\.https\:\/\/www.youtube.com.+\.\./gi,
        };

        var userReplaceFunctions = {
          url: function (_url) {
            return (
              '<br><iframe width="95%" height="50%" src="' +
              _url.replace(/\.\./g, "") +
              '" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe><br>'
            );
          },
        };
        //text.innerHTML = msg.replace("\n", "<br>");
        text.innerHTML = text.innerHTML.replace(
          userPatterns["url"],
          userReplaceFunctions["url"]
        );
      }
    }
  }
}

function addGif() {
  var contents =
    "<li id='thinkAni' class = 'chat_bot'>" +
    "<div class='message chat_ib'>" +
    "<img src='images/loading1.gif'>" +
    "</div></li>";
  $(".discussion").append(contents);
  scrollTop(600);
}

function addGif2() {
  var contents =
    "<li id='thinkAni' class = 'chat_bot'>" +
    "<div class='typing-indicator'>" +
    "<span></span>" +
    "<span></span>" +
    "<span></span>" +
    "</div></li>";
  $(".discussion").append(contents);
  scrollTop(600);
}

function scrollTop(num) {
  $(function () {
    $("#box").scrollTop($("#box")[0].scrollHeight);
  });
}

//채팅초기화버튼 클릭 => 로컬스토리지키삭제, 쓰레드 신규 생성하도록 함. 새로운 인사메시지 출력
const reset = document.getElementById("btn-check-outlined-reset");
reset.addEventListener("click", Reset_chat);

function Reset_chat(e) {
  localStorage.removeItem("openai_thread");
  addToDiscussion2(
    "아이유",
    "안녕하세요.\n갤럭시 웨어러블 가이드를 맡게 된 아이유 입니다. 새로운 대화를 시작 해 볼까요?"
  );
  console.log(localStorage.length);
}

async function send(mag) {
  try {
    //localstorage, 로컬스토리지 키, 밸류 생성
    let user_thread_id = "";
    if (!localStorage.getItem("openai_thread")) {
      let rand = Math.random().toString(16);
      localStorage.setItem("openai_thread", rand);
      user_thread_id = rand;
      console.log("new:" + rand);
    } else {
      user_thread_id = localStorage.getItem("openai_thread");
      console.log("exist:" + user_thread_id);
    }

    addGif(); //생각중 아이콘 로딩

    //django api 테스트
    // const response3 = await fetch("http://192.168.4.76:8080/list/1", {
    //   method: "GET",
    // });
    // const prediction3 = await response3.text();
    // console.log(prediction3);

    //질문 답변 요청
    const response = await fetch("../ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: mag, id: user_thread_id }),
    });

    const prediction = await response.json();

    //음성 듣기 체크박스 확인
    const ckb_audio = document.getElementById("btn-check-outlined");
    const is_checked = ckb_audio.checked;

    if (is_checked == true) {
      //음성 요청
      const response2 = await fetch("../voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prediction.response,
          id: user_thread_id,
        }),
      });

      const mp3 = await response2.arrayBuffer();
      const blob = new Blob([mp3], { type: "audio/wav" });
      const url = window.URL.createObjectURL(blob);

      //음성표현
      const audio = document.getElementById("myAudio");
      audio.setAttribute("src", url);
      audio.load();
      audio.play();
    }

    //텍스트, 음성까지 모둘 불러온 후, 동작
    $("#thinkAni").remove();

    //텍스트표현
    console.log(prediction.response);
    addToDiscussion2("아이유", prediction.response);

    setTimeout(() => scrollTop(600), 500);
  } catch (error) {
    console.error("Error fetching data:", error);
    alert("오류가 발생하였습니다. :" + error);
  } finally {
  }
}
