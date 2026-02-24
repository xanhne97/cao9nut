const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let players = {};
let revealed = {};
let hostId = null;

function randomCard(){ return Math.floor(Math.random()*13)+1; }

io.on("connection",(socket)=>{

  socket.on("join",(name)=>{
    players[socket.id]={name,cards:[],score:0,total:0};

    if(!hostId) hostId=socket.id;

    io.emit("log",`${name} đã vào bàn`);
    io.emit("players",{list:Object.values(players),host:players[hostId]?.name});
    io.to(socket.id).emit("isHost",socket.id===hostId);
  });

  socket.on("deal",()=>{
    if(socket.id!==hostId) return;
    revealed={};

    Object.keys(players).forEach(id=>{
      let c=[randomCard(),randomCard(),randomCard()];
      let score=(c[0]+c[1]+c[2])%10;
      players[id].cards=c;
      players[id].score=score;
      io.to(id).emit("yourCards",c);
    });

    io.emit("log","Host đã chia bài");
  });

  socket.on("reveal",()=>{
    revealed[socket.id]=true;

    if(Object.keys(revealed).length===Object.keys(players).length){
      let max=-1,winner="";
      Object.values(players).forEach(p=>{
        if(p.score>max){max=p.score;winner=p.name;}
      });

      Object.values(players).forEach(p=>{
        if(p.name===winner) p.total+=1;
      });

      io.emit("showAll",players);
      io.emit("winner",{winner,max});
      io.emit("scoreboard",Object.values(players));
      io.emit("log",`🏆 ${winner} thắng ván (${max==0?"Bù":max})`);
    }
  });

  socket.on("disconnect",()=>{
    let name=players[socket.id]?.name;
    delete players[socket.id];

    if(name) io.emit("log",`${name} đã rời bàn`);

    if(socket.id===hostId){
      hostId=Object.keys(players)[0]||null;
    }

    io.emit("players",{list:Object.values(players),host:players[hostId]?.name});
    if(hostId) io.to(hostId).emit("isHost",true);
  });

});

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log("Server "+PORT));