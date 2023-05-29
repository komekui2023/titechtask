chrome.runtime.onMessage.addListener(function(mes, sender, cb){
	if(mes == "icon"){
		updateIcon();
	}
	if(mes == "load"){
		chrome.storage.local.get(["token", "date", "tasks", "marked"], function(s){
			if(s.token){
				var marked = s.marked? JSON.parse(s.marked) : [];
				loadTasks(cb, s.token, marked);
			}
			else{
				loadTasksAfterUpdateToken(cb, marked);
			}
		});
	}
	return true;
});


function updateIcon(){
	chrome.storage.local.get(["tasks", "marked"], function(s){
		tasks = s.tasks? JSON.parse(s.tasks) : [];
		marked = s.marked? JSON.parse(s.marked) : [];
		chrome.browserAction.setBadgeBackgroundColor({ color: "#6C90C1" });
		chrome.browserAction.setBadgeText({ text: String(tasks.length - marked.length) });
	});
}

function loadTasksAfterUpdateToken(cb, marked){
	var xhr2 = new XMLHttpRequest();
	xhr2.open("get", "https://t2schola.titech.ac.jp/admin/tool/mobile/launch.php?service=moodle_mobile_app&passport=14029&urlscheme=mmt2schola");
	xhr2.responseType = "document";
	xhr2.send();
	xhr2.onload = function(){
		if(xhr2.responseURL.indexOf("portal.nap.gsic.titech.ac.jp") == -1){
			var href_text = xhr2.responseXML.getElementById("launchapp").href;
			token = atob(href_text.replace("mmt2schola://token=","")).split(":::")[1];
			chrome.storage.local.set({"token": token}, function(){});
			loadTasks(cb, token, marked);
			console.log("tokenを更新");
		}
		else{
			cb({message: "Portalにログインしてください"});
		}
	};
}


function loadTasks(cb, token){
	var userid = "";
	var xhr1 = new XMLHttpRequest();
	xhr1.open("post", "https://t2schola.titech.ac.jp/webservice/rest/server.php?moodlewsrestformat=json&wsfunction=core_webservice_get_site_info", false);
	xhr1.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	xhr1.send("wsfunction=core_webservice_get_site_info&wstoken=" + token);
	var result_json = JSON.parse(xhr1.responseText);
	if(result_json.errorcode == "invalidtoken"){ loadTasksAfterUpdateToken(cb); }
	else{ userid = result_json.userid; }
	
	var xhr2 = new XMLHttpRequest();
	xhr2.open("post", "https://t2schola.titech.ac.jp/webservice/rest/server.php?moodlewsrestformat=json&wsfunction=mod_assign_get_assignments", false);
	xhr2.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	xhr2.send("wsfunction=mod_assign_get_assignments&wstoken=" + token);
	var result_json = JSON.parse(xhr2.responseText);
	var tasks = [];
	var tasks_check_marked = [];
	for(var i=0; i<result_json.courses.length; i++){
		var assignments = result_json.courses[i].assignments;
		for(var j=0; j<assignments.length; j++){
			tasks[tasks.length] = {
				"subject": result_json.courses[i].fullname,
				"id": assignments[j].id,
				"cmid": assignments[j].cmid,
				"title": assignments[j].name,
				"deadline": assignments[j].duedate
			};
			if(marked.indexOf(assignments[j].id) == -1){
				tasks_check_marked[tasks_check_marked.length] = {
					"title": assignments[j].name,
					"id": assignments[j].id,
					"cmid": assignments[j].cmid
				};
			}
		}
	}
	tasks.sort(function(a,b){ return a.deadline-b.deadline; });
	chrome.storage.local.set({"tasks": JSON.stringify(tasks), "date": JSON.stringify(Math.floor(new Date().getTime()/1000))}, function(){});
	
	var tasks_check_marked_count = 0;
	for(var i=0; i<tasks_check_marked.length; i++){
		(function(i){
			var xhr = new XMLHttpRequest();
			xhr.open("post", "https://t2schola.titech.ac.jp/webservice/rest/server.php?moodlewsrestformat=json&wsfunction=mod_assign_get_submission_status");
			xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
			xhr.send("wsfunction=mod_assign_get_submission_status&userid=" + userid + "&assignid=" + tasks_check_marked[i].id + "&wstoken=" + token);
			xhr.onloadend = function(){
				var result_json = JSON.parse(xhr.responseText);
				console.log(result_json.lastattempt.submission.status);
				if(result_json.lastattempt.submission.status == "submitted"){
					marked[marked.length] = tasks_check_marked[i].id;
					chrome.storage.local.set({"marked": JSON.stringify(marked)}, function(){});
					updateIcon();
				}
				if(++tasks_check_marked_count == tasks_check_marked.length){
					cb({message: "更新しました。", refresh: true});
				}
			};
		})(i);
	}
	setTimeout(function(){
		cb({message: "更新しました。", refresh: true});
	}, 5000);
}

updateIcon();
