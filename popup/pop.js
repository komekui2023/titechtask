// UNIX時間をyyyy/m/d(曜) hh:mm形式文字列に変換
function unix2date(t){
	var time = new Date(t*1000);
	return time.toLocaleDateString() + "(" + [ "日", "月", "火", "水", "木", "金", "土" ][time.getDay()] + ") " + time.toLocaleTimeString().substr(0, time.toLocaleTimeString().length - 3);
}


// 秒数を経過時間文字列に変換
function sec2elapsed(t){
	if(t < 60){ return t + "秒前"; }
	if(t < 60*60){ return Math.floor(t/60) + "分前"; }
	if(t < 60*60*48){ return Math.floor(t/60/60) + "時間前"; }
	return Math.floor(t/60/60/24) + "日前";
}


// 課題を表示 第三引数が真だと提出済みを表示
function drawTasks(tasks, marked, show_marked){
	var time_now = Math.floor(new Date().getTime()/1000);
}


// 更新ボタンを押した時の処理
document.getElementById("reflesh").onclick = function(){
	document.getElementById("date").innerHTML = "更新中…";
	chrome.runtime.sendMessage("load" ,function(r){
		if(r.refresh){ location.reload(); }
		else{
			document.getElementById("date").innerHTML = r.message;
		}
	});
	return false;
};


// 削除済み課題表示ボタンを押した時の処理
document.getElementById("show_marked").onclick = function(){
	location.search = "show_marked=true";
};


// データ読込・描画処理
chrome.storage.local.get(["date", "tasks", "marked"], function(s){
	var time_now = Math.floor(new Date().getTime()/1000);
	if(s.date){
		document.getElementById("date").innerHTML = "更新: " + sec2elapsed(time_now - s.date);
	}
	else{
		document.getElementById("date").innerHTML = "更新ボタンを押してください→";
	}
	tasks = s.tasks? JSON.parse(s.tasks) : [];
	marked = s.marked? JSON.parse(s.marked) : [];
	
	document.getElementById("show_marked").firstChild.innerHTML += ("(" + marked.length + ")");
	
	var show_marked = (location.search.indexOf("show_marked") != -1);
	
	for(var i=0; i<tasks.length; i++){
		if(!show_marked && marked.indexOf(tasks[i].id) != -1){ continue; }
		if(show_marked  && marked.indexOf(tasks[i].id) == -1){ continue; } 
		var li = document.createElement("li");
		var span1 = document.createElement("span");
		span1.innerHTML = tasks[i].title;
		li.appendChild(span1);
		var span2 = document.createElement("span");
		if(!show_marked){
			span2.innerHTML = tasks[i].subject + "<br>" + unix2date(tasks[i].deadline);
		}
		else{
			span2.innerHTML = tasks[i].subject + "<br><s>" + unix2date(tasks[i].deadline) + "</s> 提出済";
		}
		li.appendChild(span2);
		var del = document.createElement("a");
		del.href = "#";
		del.innerHTML = "×";
		li.appendChild(del);
		if(!show_marked && tasks[i].deadline - time_now < 0){ li.className = "expired"; }
		(function(i, show_marked){
			del.onclick = function(){
				event.stopPropagation();
				if(!show_marked){
					marked[marked.length] = tasks[i].id;
				}
				else{
					marked = marked.filter(function(t){return t!=tasks[i].id;});
				}
				chrome.storage.local.set({"marked": JSON.stringify(marked)}, function(){});
				chrome.runtime.sendMessage("icon");
				location.reload();
			};
			li.onclick = function(){
				var url = "https://t2schola.titech.ac.jp/mod/assign/view.php?id=" + tasks[i].cmid;
				chrome.tabs.create({url: url});
			};
		})(i, show_marked);
		document.getElementById("tasks").appendChild(li);
	}
	if(show_marked){
		document.getElementById("tasks").className = "marked";
	}
});

