<script lang="ts">
	import { st } from "../../state.svelte.ts";

	let username = $state("");
	let email = $state("");
	let password = $state("");

	let loginMessage: HTMLElement;
	let clanDBMessage: HTMLElement;

	function startLogin() {
		if (!st.socket) return;
		st.socket.emit("dbLogin", {
			userName: username,
			userPass: password,
		});
		loginMessage.style.display = "block";
		loginMessage.textContent = "Please Wait...";
	}
	function startRegister() {
		if (!st.socket) return;
		st.socket.emit("dbReg", {
			userName: username,
			userEmail: email,
			userPass: password,
		});
		loginMessage.style.display = "block";
		loginMessage.textContent = "Registering...";
	}
	function startRecover() {
		if (!st.socket) return;
		st.socket.emit("dbRecov", {
			userMail: email,
		});
		loginMessage.style.display = "block";
		loginMessage.textContent = "Please Wait...";
	}
	function logout() {
		loginMessage.textContent = "";
		st.loggedIn = false;
		localStorage.setItem("logKey", "");
		localStorage.setItem("userName", "");
		st.socket?.emit("dbLogout");
	}
</script>
<!-- NOT LOGGED IN -->
<div style:width="300px" style:display={st.loggedIn ? "none" : null}>
	<h3 class="menuHeaderTabbed">LOGIN &amp; REGISTER</h3>
	<input
		type="text"
		class="menuTextInput"
		style="margin-bottom:10px;"
		placeholder="Username"
		id="usernameInput"
		maxlength="15"
		bind:value={username}
	>
	<input
		type="text"
		class="menuTextInput"
		style="margin-bottom:10px;"
		placeholder="Email (Registration Only)"
		id="emailInput"
		maxlength="40"
		bind:value={email}
	>
	<input
		type="password"
		class="menuTextInput"
		placeholder="Password"
		id="passwordInput"
		maxlength="15"
		bind:value={password}
	>
	<div id="loginMessage" bind:this={loginMessage} style="display:none;"></div>
	<button type="button" id="registerButton" onclick={startRegister} class="smallMenuButton">REGISTER</button>
	<button type="button" id="loginButton" onclick={startLogin} class="smallMenuButton">LOGIN</button>
	<button type="button" id="recoverButton" onclick={startRecover} class="smallMenuButton">RECOVER</button>
	<div id="recoverForm" style="display:none;">
		<input class="menuTextInput" placeholder="Enter Key" id="chngPassKey" maxlength="4" style="width:100%;">
		<input
			class="menuTextInput"
			type="password"
			placeholder="Enter new Password"
			id="chngPassPass"
			maxlength="15"
			style="width:72%;margin-top:10px;"
		>
		<button type="button" id="chngPassButton" class="smallMenuButton" style="margin-left:5px;margin-top:10px;">
			Change
		</button>
	</div>
</div>
<!-- LOGGED IN -->
<div style:display={st.loggedIn ? null : "none"}>
	<div id="accountStatWrapper">
		<h3 class="menuHeaderTabbed">YOUR STATS</h3>
		<div id="rankProgressCont">
			<div id="rankProgress" style:width={`${st.player.account?.rankPercent ?? 0}%`}></div>
		</div>
		<div><b>Rank: </b>{st.player.account?.rank ?? "..."}</div>
		<div><b>World Rank: </b>{st.player.account?.worldRank ?? "..."}</div>
		<div><b>Likes: </b>{st.player.account?.likes ?? "..."}</div>
		<div><b>Kills: </b>{st.player.account?.kills ?? "..."}</div>
		<div><b>Deaths: </b>{st.player.account?.deaths ?? "..."}</div>
		<div><b>KD: </b>{st.player.account?.kd ?? "..."}</div>
		<h3 id="clanHeader">CLANS</h3>
		<div id="clanSignUp" style="display:none;">
			<input class="menuTextInput" placeholder="Clan Name" id="clanNameInput" maxlength="4" style="width:70%;">
			<button type="button" id="createClanButton" class="smallMenuButton" style="margin-left:5px;">CREATE</button>
			<input class="menuTextInput" placeholder="Clan Name" id="clanKeyInput" maxlength="4" style="width:78%;">
			<button type="button" id="joinClanButton" class="smallMenuButton" style="margin-left:5px;">JOIN</button>
			<div id="clanDBMessage" bind:this={clanDBMessage} class="serverRespMsg">Join or Create a Clan.</div>
		</div>
		<div id="clanStats" style="display:none;">
			<div id="clanStatFounder"><b>Founder: </b>{st.clanData.founder ?? "..."}</div>
			<div id="clanStatRank"><b>Rank: </b>{st.clanData.rank ?? "..."}</div>
			<div id="clanStatKD"><b>Avg KD: </b>{st.clanData.kd ?? "..."}</div>
			<div id="clanStatMembers">
				<b>Roster: </b>
				<br>
				{st.clanData.members ?? "..."}
			</div>
			<div id="clanChatLink" style="margin-top:5px;">
				{#if st.clanData.chatURL && typeof st.clanData.chatURL === "string"}
					{@const chatURL = st.clanData.chatURL.startsWith("http") ? st.clanData.chatURL : `https://${st.clanData.chatURL}`}
					<a target="_blank" href={chatURL} rel="noopener"> Clan Chat </a>
				{/if}
			</div>
			<div id="clanAdminPanel" style="display:none;margin-top:10px;">
				<input class="menuTextInput" placeholder="Clan Chat URL" id="clanChatInput" maxlength="50" style="width:95%;">
				<button type="button" id="setChatClanButton" class="smallMenuButton" style="margin-top:10px;">UPDATE</button>
				<div id="clanChtMessage" class="serverRespMsg" style="display:inline-block;margin-left:5px;">
					(eg. Discord URL)
				</div>
				<input class="menuTextInput" placeholder="Username" id="clanInviteInput" maxlength="15" style="width:95%;">
				<button type="button" id="inviteClanButton" class="smallMenuButton" style="margin-top:10px;">INVITE</button>
				<button type="button" id="kickClanButton" class="smallMenuButton" style="margin-left:5px;margin-top:10px;">
					KICK
				</button>
				<div id="clanInvMessage" class="serverRespMsg">Invite or Kick Members.</div>
			</div>
		</div>
		<div id="editAccount">
			<h3 class="menuHeaderTabbed" style="margin-top:8px;">EDIT PROFILE</h3>
			<input
				class="menuTextInput"
				placeholder="Username"
				id="newUsernameInput"
				maxlength="15"
				style="margin-bottom:10px;width:95%;"
			>
			<input
				class="menuTextInput"
				placeholder="Youtube Channel Name/ID"
				id="youtubeChannelInput"
				style="margin-bottom:10px;width:95%;"
			>
			<button type="button" id="saveAccountData" class="smallMenuButton">SAVE</button>
			<div id="editProfileMessage" class="serverRespMsg">Edit Profile Info.</div>
		</div>
	</div>
	<button
		type="button"
		id="logoutButton"
		onclick={logout}
		class="smallMenuButton"
		style="margin-top:10px; margin-bottom:0px;"
	>
		LOGOUT
	</button>
	<button
		type="button"
		id="leaveClanButton"
		onclick={() => st.socket?.emit("dbClanLeave")}
		class="smallMenuButton"
		style="margin-top:10px; margin-left:5px; margin-bottom:0px; display:none;"
	>
		LEAVE CLAN
	</button>
	<button
		type="button"
		class="smallMenuButton"
		style="margin-top:10px; margin-bottom:0px; margin-left:5px;"
		onclick={() => window.open(`/profile.html?${st.player.account.user_name}`, "_blank")}
	>
		PROFILE
	</button>
</div>

<style>
	#loginMessage {
		margin-top: 10px;
	}

	#accountStatWrapper {
		max-height: 190px;
		overflow-y: scroll;
		line-height: 220%;
	}

	.serverRespMsg {
		margin-top: 0px;
	}

	#registerButton {
		margin-top: 10px;
	}

	#loginButton {
		margin-top: 10px;
		margin-left: 5px;
	}

	#recoverButton {
		margin-top: 10px;
		margin-left: 5px;
	}
</style>
