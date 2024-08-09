const socket = io(
  window.location.hostname === "localhost"
    ? "ws://localhost:3500"
    : window.location.origin
);

const toggleCameraBtn = document.getElementById('toggle-camera');
const localVideo = document.getElementById('local-video');
const remoteCameras = document.getElementById('remote-cameras');
const msgInput = document.querySelector("#message");
const nameInput = document.querySelector("#name");
const chatRoom = document.querySelector("#room");
const activity = document.querySelector(".activity");
const usersList = document.querySelector(".user-list");
const roomList = document.querySelector(".room-list");
const chatDisplay = document.querySelector(".chat-display");

let localStream;
let remoteStreams = {};

function toggleCamera() {
  if (localStream) {
    const videoTrack = localStream.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
    socket.emit('toggle-camera', { room: chatRoom.value, enabled: videoTrack.enabled });
  } else {
    startCamera();
  }
}

function startCamera() {
  navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    .then(stream => {
      localStream = stream;
      localVideo.srcObject = stream;
      localVideo.play();
      socket.emit('camera-on', { room: chatRoom.value });
    })
    .catch(err => {
      console.error('Error accessing camera: ', err);
    });
}

function addRemoteCamera(userId, userName, stream) {
  let remoteDiv = document.createElement('div');
  remoteDiv.className = 'remote-camera';
  remoteDiv.id = `camera-${userId}`;

  if (stream) {
    let video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    video.classList.add('w-100', 'h-100');
    remoteDiv.appendChild(video);
  } else {
    let nameDiv = document.createElement('div');
    nameDiv.className = 'username';
    nameDiv.textContent = userName;
    remoteDiv.appendChild(nameDiv);
  }

  remoteCameras.appendChild(remoteDiv);
}

function removeRemoteCamera(userId) {
  let remoteDiv = document.getElementById(`camera-${userId}`);
  if (remoteDiv) {
    remoteDiv.remove();
  }
}

function sendMessage(e) {
  e.preventDefault();
  if (nameInput.value && msgInput.value && chatRoom.value) {
    socket.emit("message", {
      name: nameInput.value,
      text: msgInput.value,
    });
    msgInput.value = "";
  }
  msgInput.focus();
}

function enterRoom(e) {
  e.preventDefault();
  if (nameInput.value && chatRoom.value) {
    socket.emit("enterRoom", {
      name: nameInput.value,
      room: chatRoom.value,
    });
    startCamera(); // Bắt đầu camera ngay khi tham gia phòng
  }
}

// Lắng nghe sự kiện từ server
document.querySelector(".form-msg").addEventListener("submit", sendMessage);

document.querySelector(".form-join").addEventListener("submit", enterRoom);

toggleCameraBtn.addEventListener('click', toggleCamera);

msgInput.addEventListener("keypress", () => {
  socket.emit("activity", nameInput.value);
});

// Lắng nghe sự kiện camera từ các người dùng khác
socket.on('remote-camera', ({ userId, userName, stream }) => {
  if (!remoteStreams[userId]) {
    addRemoteCamera(userId, userName, stream);
    remoteStreams[userId] = stream;
  }
});

socket.on('camera-off', userId => {
  removeRemoteCamera(userId);
});

// Xử lý khi người dùng ngắt kết nối
socket.on('user-disconnect', userId => {
  removeRemoteCamera(userId);
});

// Lắng nghe các sự kiện tin nhắn, danh sách người dùng, phòng chat...
socket.on("message", (data) => {
  activity.textContent = "";
  const { name, text, time } = data;
  const li = document.createElement("li");
  li.className = "post";
  if (name === nameInput.value) li.className = "post post--left";
  if (name !== nameInput.value && name !== "Admin")
    li.className = "post post--right";
  if (name !== "Admin") {
    li.innerHTML = `<div class="post__header ${
      name === nameInput.value ? "post__header--user" : "post__header--reply"
    }">
        <span class="post__header--name">${name}</span> 
        <span class="post__header--time">${time}</span> 
        </div>
        <div class="post__text">${text}</div>`;
  } else {
    li.innerHTML = `<div class="post__text">${text}</div>`;
  }
  document.querySelector(".chat-display").appendChild(li);

  chatDisplay.scrollTop = chatDisplay.scrollHeight;
});

let activityTimer;
socket.on("activity", (name) => {
  activity.textContent = `${name} is typing...`;

  // Xóa thông báo sau 3 giây
  clearTimeout(activityTimer);
  activityTimer = setTimeout(() => {
    activity.textContent = "";
  }, 3000);
});

socket.on("userList", ({ users }) => {
  showUsers(users);
});

socket.on("roomList", ({ rooms }) => {
  showRooms(rooms);
});

function showUsers(users) {
  usersList.textContent = "";
  if (users) {
    usersList.innerHTML = `<em>Users in ${chatRoom.value}:</em>`;
    users.forEach((user, i) => {
      usersList.textContent += ` ${user.name}`;
      if (users.length > 1 && i !== users.length - 1) {
        usersList.textContent += ",";
      }
    });
  }
}

function showRooms(rooms) {
  roomList.textContent = "";
  if (rooms) {
    roomList.innerHTML = "<em>Active Rooms:</em>";
    rooms.forEach((room, i) => {
      roomList.textContent += ` ${room}`;
      if (rooms.length > 1 && i !== rooms.length - 1) {
        roomList.textContent += ",";
      }
    });
  }
}
