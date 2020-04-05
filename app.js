//https://www.youtube.com/watch?v=JEYEpledOxs

const app = require("express")();
const http = require("http").Server(app);
const Socketio = require("socket.io")(http);

var clients = [];
var projectiles = [];
var projectilesTimer;
var heartbeats = 0;
var r = 5;

Socketio.on("connection", socket => {

	socket.on('getid', ()=> {
		clients.push({
			id: clients.length,
			position : {
				x : 200,
				y : 200+Math.random() * 100
			},
			mouse : {
				x : 0,
				y : 0
			}
		});
		socket.emit('yourid', {yourdata: clients[clients.length-1], clients: clients, projectiles});
	});


	heartBeat(Socketio) ;
	
	socket.on("fire", (data)=>{
		projectiles = [];
		let pObj = {
			x: data.position.x,
			y: data.position.y,
			theta : getTheta(data),
			life: 100,
			id: projectiles.length,
			parentId: data.id
		};
		projectiles.push(pObj);

		updateProjectiles(Socketio);

	});



	socket.on("mouseMove", (data) => {
		clients.forEach( player => {
			if( player.id === data.id) {
				player.mouse.x = data.mouse.x;
				player.mouse.y = data.mouse.y
				Socketio.emit("mousePosition", {projectiles, clients});
			}
		} );
	} );

	socket.on("move", data=> { //socket emit to 1 socket
		clients.forEach( player => {
			if( player.id === data.id ) {
				getNextPost(data, player);
			}
		});

		Socketio.emit("position", {projectiles, clients});
	});

	socket.on("beatback", id=>{

		clients.forEach(x => x.alive=(x.id === id)?true:x.alive );
	});
});

function getNextPost(data, player) {

	let vector2 = {
		x : (data.mouse.x - data.position.x),
		y : (data.mouse.y - data.position.y)
	}
	let vector1 = {
		x: 0,
		y: 1
	}

	let theta = Math.atan2(vector2.y, vector2.x); 

	switch(data.direction) {
		case 'down': theta =  theta + Math.PI ;break;
		case 'right': theta =  theta + (Math.PI / 2)  ;break;
		case 'left':  theta =  theta - (Math.PI / 2)  ;break;
	}
	let lineToX = data.position.x + r * Math.cos(theta);
	let lineToY = data.position.y + r * Math.sin(theta);

	player.position.x = lineToX;
	player.position.y = lineToY;

}

function updateProjectiles(Socketio) {
	if(projectiles.length) {
		projectiles.forEach( p =>{
			updateProjectilePosition(p);
			checkIfHit(p);
		});
		projectilesTimer = setTimeout((function(){
			Socketio.emit("projectileUpdate", {projectiles, clients});
			clearTimeout(projectilesTimer);	
			updateProjectiles(Socketio);
		}).bind(null, Socketio,projectiles) , 10);
			
	} else {
		clearTimeout(projectilesTimer);
	}
}

function checkIfHit(p) {
	clients.forEach( c=>{
		if( p.parentId !== c.id ) {
			let xdif = Math.abs( c.position.x - getProjectileNextPos(p).x);
			let ydif = Math.abs( c.position.y - getProjectileNextPos(p).y);
	
			if(xdif < 10 && ydif < 10) {
				console.log("HIT!", xdif, ydif);
				// p.life = 0;
				let index = projectiles.indexOf( projectiles.find(x=> x.id === p.id));
				projectiles.splice(index,1);
			}
		}
	});
}

function updateProjectilePosition(p) {
	if( p.life -1 > 0 ) {
		p.x = getProjectileNextPos(p).x;
		p.y = getProjectileNextPos(p).y;
		p.life -= 1;
	} else {
		let index = projectiles.indexOf( projectiles.find(x=> x.id === p.id));
		projectiles.splice(index,1);
	}
}

function getProjectileNextPos(p) {
	return {
		x: p.x + 5 * Math.cos(p.theta),
		y: p.y + 5  * Math.sin(p.theta)
	}
}

function getTheta(data) {
	let vector2 = {
		x : (data.mouse.x - data.position.x),
		y : (data.mouse.y - data.position.y)
	}
	let vector1 = {
		x: 0,
		y: 1
	}
	return Math.atan2(vector2.y, vector2.x); 	
}

function heartBeat(Socketio) {
	setTimeout( (function(){ 
		Socketio.emit("heartbeat", clients) 
		heartbeats++;
		if( heartbeats > 10 ) {
			heartbeats = 0;
			clients.forEach( (x,i)=> {
				if( x.alive !== true ) {
					clients.splice(i,1);
				}
			} );
			clients.forEach(x=> x.alive=undefined );
		}
		heartBeat(Socketio);
	}).bind(null, Socketio, clients), 1000 );
}

http.listen(3000, () => {
	console.log("listening ");
});

