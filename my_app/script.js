(function () {
	var DAYS = [
		["2026-04-10", "Sun 4 Oct"],
		["2026-10-10", "Sat 10 Oct"],
		["2026-10-11", "Sun 11 Oct"]
	];

	var ROLES = [
		"Entertainment",
		"Logistics",
		"Design & Decor",
		"Marketing & Promotions",
		"Budgeting",
	];

	var $ = function (id) {
		return document.getElementById(id);
	};

	var items = [];
	var applicants = [];
	var isLoggedIn = false;
	var selectedSlot = "";
	var uid =
		localStorage.getItem("prom_user_id") ||
		"user_" + Math.random().toString(36).substr(2, 9);
	localStorage.setItem("prom_user_id", uid);

	function mk(tag, cls, txt) {
		var e = document.createElement(tag);
		if (cls) e.className = cls;
		if (txt != null) e.textContent = txt;
		return e;
	}

	function hm(m) {
		return (
			("0" + Math.floor(m / 60)).slice(-2) + ":" + ("0" + (m % 60)).slice(-2)
		);
	}

	function fmt(t) {
		var p = t.split(":");
		var h = +p[0];
		var ap = h >= 12 ? "pm" : "am";
		h = h % 12 || 12;
		return h + ":" + p[1] + ap;
	}

	function dayLabel(d) {
		for (var i = 0; i < DAYS.length; i++) {
			if (DAYS[i][0] === d) return DAYS[i][1];
		}
		return d;
	}

	function fillClasses() {
		var s = $("cls");
		if (!s) return;
		s.textContent = "";
		var p = mk("option", "", "Select class");
		p.value = "";
		s.appendChild(p);

		"ABCDEFGHI".split("").forEach(function (c) {
			var o = mk("option", "", "11" + c);
			o.value = "11" + c;
			s.appendChild(o);
		});
	}

	function fillRoles() {
		var r = $("role");
		if (!r) return;
		r.textContent = "";
		var p = mk("option", "", "Select role");
		p.value = "";
		r.appendChild(p);

		ROLES.forEach(function (roleName) {
			var o = mk("option", "", roleName);
			o.value = roleName;
			r.appendChild(o);
		});
	}

	function refreshSlots() {
		var container = $("slot-tiles");
		var dayElem = $("day");
		if (!container || !dayElem) return;

		container.textContent = "";
		var currentDay = dayElem.value;

		for (var m = 16 * 60; m <= 18 * 60 + 45; m += 15) {
			(function () {
				var st = hm(m);
				var isTaken = items.some(function (o) {
					return o.day === currentDay && o.start === st && o.id !== uid;
				});

				var tile = mk("div", "slot-tile", fmt(st) + " - " + fmt(hm(m + 10)));

				if (isTaken) {
					tile.classList.add("taken");
				} else {
					if (selectedSlot === st) {
						tile.classList.add("selected");
					}

					tile.onclick = function () {
						var tiles = container.querySelectorAll(".slot-tile");
						tiles.forEach(function (t) {
							t.classList.remove("selected");
						});

						tile.classList.add("selected");
						selectedSlot = st;
						$("slot").value = st;
						$("msg").textContent = "";
					};
				}

				container.appendChild(tile);
			})();
		}

		if (
			selectedSlot &&
			items.some(function (o) {
				return o.day === currentDay && o.start === selectedSlot && o.id !== uid;
			})
		) {
			selectedSlot = "";
			$("slot").value = "";
		}
	}

	function renderApplicantPage() {
		if (!$("signup")) return;
		refreshSlots();
		var mine = items.filter(function (i) {
			return i.id === uid;
		})[0];

		$("mine").textContent = mine
			? "You're booked: " +
				dayLabel(mine.day) +
				", " +
				fmt(mine.start) +
				"–" +
				fmt(mine.end) +
				". Select another slot to change."
			: "";
		$("save").textContent = mine ? "Update my booking" : "Book my interview";

		if (mine && !selectedSlot) {
			if ($("name") && !$("name").value) $("name").value = mine.name || "";
			if ($("cls") && mine.cls) $("cls").value = mine.cls;
			if ($("role") && mine.role) $("role").value = mine.role;
			if ($("day") && mine.day) $("day").value = mine.day;
			selectedSlot = mine.start;
			$("slot").value = mine.start;
			refreshSlots();
		}
	}

	function renderStaffTable() {
		if (!$("staff")) return;
		$("login").hidden = isLoggedIn;
		$("table").hidden = !isLoggedIn;

		if (!isLoggedIn) return;

		var rows = applicants.slice().sort(function (a, b) {
			return a.day === b.day
				? a.start < b.start
					? -1
					: 1
				: a.day < b.day
					? -1
					: 1;
		});

		$("tcount").textContent = "Applicants (" + rows.length + ")";
		var t = mk("table");
		var hr = mk("tr");

		["#", "Day", "Time", "Name", "Class", "Role applied for", "Action"].forEach(
			function (h) {
				hr.appendChild(mk("th", "", h));
			},
		);
		t.appendChild(hr);

		rows.forEach(function (r, n) {
			var tr = mk("tr");
			[
				n + 1,
				dayLabel(r.day),
				fmt(r.start) + " – " + fmt(r.end),
				r.name,
				r.cls,
				r.role,
			].forEach(function (v) {
				tr.appendChild(mk("td", "", v));
			});

			var td = mk("td");
			var b = mk("button", "ghost", "Delete");
			b.onclick = function () {
				if (confirm("Delete booking for " + r.name + "?")) deleteBooking(r.id);
			};
			td.appendChild(b);
			tr.appendChild(td);

			t.appendChild(tr);
		});

		var w = $("tbl");
		w.textContent = "";
		if (!rows.length) {
			w.appendChild(mk("div", "meta", "No applicants yet."));
		} else {
			w.appendChild(t);
		}
	}

	function fetchApplicants() {
		fetch("/api/interviews")
			.then(function (res) {
				return res.json();
			})
			.then(function (data) {
				applicants = data;
				renderStaffTable();
			});
	}

	function deleteBooking(id) {
		fetch("/api/interviews/" + id, { method: "DELETE" }).then(function () {
			fetchApplicants();
			loadData();
		});
	}

	function loadData() {
		fetch("/api/interviews")
			.then(function (res) {
				return res.json();
			})
			.then(function (data) {
				items = data;
				renderApplicantPage();
			})
			.catch(function () {
				var n = $("notice");
				if (n) n.textContent = "Could not connect to server.";
			});
	}

	if ($("day")) {
		$("day").onchange = function () {
			selectedSlot = "";
			$("slot").value = "";
			loadData();
		};
	}

	window.onfocus = function () {
		loadData();
	};

	if ($("f")) {
		$("f").onsubmit = function (ev) {
			ev.preventDefault();
			var slotValue = $("slot").value;

			var x = {
				id: uid,
				name: $("name").value.trim(),
				cls: $("cls").value,
				role: $("role").value,
				day: $("day").value,
				start: slotValue,
			};

			if (!x.name || !x.cls || !x.role || !x.start) {
				$("msg").textContent =
					"Please select a time slot and fill in all fields.";
				return;
			}

			var m = +x.start.split(":")[0] * 60 + +x.start.split(":")[1];
			x.end = hm(m + 10);

			var btn = $("save");
			btn.disabled = true;
			$("msg").textContent = "";

			fetch("/api/interviews", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(x),
			})
				.then(function (res) {
					if (res.status === 409) {
						throw new Error(
							"This slot was just booked by someone else! Please pick another tile.",
						);
					}
					if (!res.ok) throw new Error("Couldn't save booking. Try again.");
					return res.json();
				})
				.then(function () {
					loadData();
				})
				.catch(function (err) {
					$("msg").textContent = err.message;
					selectedSlot = "";
					$("slot").value = "";
					loadData();
				})
				.then(function () {
					btn.disabled = false;
				});
		};
	}

	if ($("lf")) {
		$("lf").onsubmit = function (e) {
			e.preventDefault();
			$("lmsg").textContent = "";

			fetch("/api/staff/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: $("un").value,
					password: $("pw").value,
				}),
			})
				.then(function (res) {
					if (!res.ok) throw new Error("Invalid credentials");
					return res.json();
				})
				.then(function (data) {
					isLoggedIn = true;
					applicants = data.applicants;
					$("un").value = "";
					$("pw").value = "";
					renderStaffTable();
				})
				.catch(function () {
					$("lmsg").textContent = "Wrong username or password.";
				});
		};
	}

	fillClasses();
	fillRoles();
	loadData();
})();
