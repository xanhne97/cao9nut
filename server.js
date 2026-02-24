const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

let players = {};
let revealed = {};

function randomCard(){ return Math.floor(Math.random()*10)+1; }

io.on("connection",(socket)=>{
  socket.on("join",(name)=>{
    players[socket.id]={name,cards:[],score:0};
    io.emit("players",Object.values(players));
  });

  socket.on("deal",()=>{
    revealed={};
    Object.keys(players).forEach(id=>{
      let c=[randomCard(),randomCard(),randomCard()];
      let score=(c[0]+c[1]+c[2])%10;
      players[id].cards=c;
      players[id].score=score;
      io.to(id).emit("yourCards",c);
    });
  });

  socket.on("reveal",()=>{
    revealed[socket.id]=true;

    if(Object.keys(revealed).length===Object.keys(players).length){
      let max=-1,winner="";
      Object.values(players).forEach(p=>{
        if(p.score>max){max=p.score;winner=p.name;}
      });
      io.emit("showAll",players);
      io.emit("winner",{winner,max});
    }
  });

  socket.on("disconnect",()=>{
    delete players[socket.id];
    io.emit("players",Object.values(players));
  });
});


server.listen(PORT,()=>console.log("Server "+PORT));