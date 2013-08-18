/*
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
 
/*
 * TERMS OF REPRODUCTION USE
 *
 * 1. Provide a link back to the original repository (this repository), as
 *     	in, https://github.com/ConnerGDavis/Plugbot, that is well-visible
 * 		wherever the source is being reproduced.  For example, should you
 * 		display it on a website, you should provide a link above/below that
 *		which the users use, titled something such as "ORIGINAL AUTHOR".
 *
 * 2. Retain these three comments:  the GNU GPL license statement, this comment,
 * 		and that below it, that details the author and purpose.
 *
 * Failure to follow these terms will result in me getting very angry at you
 * and having your software tweaked or removed if possible.  Either way, you're
 * still an idiot for not following such a basic rule, so at least I'll have
 * that going for me.
 */

/*
 * NOTE:  This is 100% procedural because I can't see a reason to add classes, etc.
 *
 * @author 	Conner Davis (Fruity Loops)
 */

var autowoot;
var autoqueue;
var hideVideo;
var userList;
var skippingVideo = false;
var UI2;
var Alert = false;
var time_last = 0;
var timeout_update;
var interval_update = 3000;
var plugBot;
/*
 * Cookie constants
 */
var COOKIE_WOOT = 'autowoot';
var COOKIE_QUEUE = 'autoqueue';
var COOKIE_HIDE_VIDEO = 'hidevideo';
var COOKIE_USERLIST = 'userlist';
var COOKIE_UI = 'UI2';
/*
 * Maximum amount of people that can be in the waitlist.
 */
var MAX_USERS_WAITLIST = 50;

/**
 * Initialise all of the Plug.dj API listeners which we use
 * to asynchronously intercept specific events and the data
 * attached with them.
 */
function initAPIListeners() 
{
    /*
     * This listens in for whenever a new DJ starts playing.
     */
    API.on(API.DJ_ADVANCE, djAdvanced);

    /*
     * This listens for changes in the waiting list
     */
    API.on(API.WAIT_LIST_UPDATE, queueUpdate);

    /*
     * This listens for changes in the dj booth
     */
    API.on(API.DJ_UPDATE, queueUpdate);

    /*
     * This listens for whenever a user in the room either WOOT!s
     * or Mehs the current song.
     */
    API.on(API.VOTE_UPDATE, onVote);
    function onVote(obj){
        time_last= 0;
        populateUserlist();
    }
    /*
     * Whenever a user joins, this listener is called.
     */
    API.on(API.USER_JOIN, onJoin);
    function onJoin(user){
        time_last= 0;
        populateUserlist();
    }

    /*
     * Called upon a user exiting the room.
     */
    API.on(API.USER_LEAVE, onLeave);
    function onLeave(user) {
        time_last= 0;
        populateUserlist();
    }
    API.on(API.CHAT, onChat)
    function onChat(data){
       $('.chat-from-host').attr('style','background-image:url(https://raw.github.com/Maxorq/LastPlug/c75755255596c8e2f35fc087f6abfc2a6d875adf/img/sparkle.gif);');
    }

    /*
     *For Custom Chat Commands
     */
    API.on(API.CHAT_COMMAND, customChatCommand);
}
function killAPIListeners()
{
    API.off(API.DJ_ADVANCE, djAdvanced);
    API.off(API.WAIT_LIST_UPDATE, queueUpdate);
    API.off(API.DJ_UPDATE, queueUpdate);
    API.off(API.VOTE_UPDATE, this.onVote);
    API.off(API.USER_JOIN, this.onJoin);
    API.off(API.USER_LEAVE, this.onJoin);
    API.off(API.CHAT, this.onChat);
    API.off(API.CHAT_COMMAND, this.customChatCommand);
}
//Version Numbering chat log
var major =2,minor=1,patch=4;
   var a = $('#chat-messages'),b = a.scrollTop() > a[0].scrollHeight - a.height() - 20;
    a.append('<div class="chat-update"><span class="chat-text" style="color:#00FF33"><b>Running PlugBot-TFL version ' + major + '.' + minor + '.' + patch + '</b></span></div>');
    b && a.scrollTop(a[0].scrollHeight);
//force update user list on user join/leave
function onJoin(){
    time_last = 0;
    setTimeout(function(){
        djAdvanced(null);
    },1000);
}

//Custom Chat Commands
function getUser(data) {
    if(API.getUsers().length > 1)
    {

        data = data.trim();
        if (data.substr(0,1) === '@')
            data = data.substr(1);

        var users = API.getUsers();
        for (var i in users) {
            if (users[i].username.equalsIgnoreCase(data) || users[i].id.equalsIgnoreCase(data))
                return users[i];
        }
        return null;
    }
    }
function customChatCommand(value)
{

if(API.hasPermission(API.getUser().id,API.ROLE.BOUNCER))
{
    if(value.indexOf('/queue')=== 0){
        user = getUser(value.substr(8))
        API.moderateAddDJ(user.id)
    }
    if(value.indexOf('/take')=== 0){
        user = getUser(value.substr(6))
        API.moderateRemoveDJ(user.id)
    }
        if (value.indexOf('/boot')=== 0) {
        if (value.indexOf('||') > 0) {
            var reason = value.substr(6).split('|| ');
            user = getUser(reason[0]);
            API.moderateKickUser(user.id,reason[1]);
            }
        else{
            user = getUser(value.substr(7));
            API.moderateKickUser(user.id,'');
        }
    }
}
    if(value.indexOf('/Alerts')===0){
        if(value.substr(8)=='on')
        {
            API.chatLog('Alerts Enabled')
            Alert = true;
        }
        if(value.substr(8)=='off')
        {
            API.chatLog('Alerts disabled')
            Alert = false;
        }
    }

    if(API.hasPermission(API.getUser().id,API.ROLE.MANAGER))
    {
       if(value.indexOf('/secure')===0){API.moderateRoomProps(true,true)}
       if(value.indexOf('/release')===0){API.moderateRoomProps(false,true)}
       if(value.indexOf('/ban')===0){      
        if (value.indexOf('||') > 0) {
            var reason = value.substr(4).split('|| ');
            user = getUser(reason[0]);
            API.moderateBanUser(user.id,reason[1]);
            }
        else{
            user = getUser(value.substr(5));
            API.moderateBanUser(user.id,'');
        }
    }
}
}
/**
 * Renders all of the Plug.bot "UI" that is visible beneath the video
 * player.
 */
function close()
{
    killAPIListeners()
    $('#plugbot-ui').remove();
    $('#plugbot-ui2').remove();
    $('#plugbot-userlist').remove();
    $('#plugbot-css').remove();
    $('#plugbot-js').remove();
}
function displayUI() 
{
    /*
     * Be sure to remove any old instance of the UI, in case the user
     * reloads the script without refreshing the page (updating.)
     */
    $('#plugbot-ui').remove();
    $('#plugbot-ui2').remove();

    /*
     * Generate the HTML code for the UI.
     */
    $('#chat').prepend('<div id="plugbot-ui"></div>');
    $('#chat').prepend('<div id="plugbot-ui2"></div>')
	
    var cWoot = autowoot ? '#3FFF00' : '#ED1C24';
    var cQueue = autoqueue ? '#3FFF00' : '#ED1C24';
    var cHideVideo = hideVideo ? '#3FFF00' : '#ED1C24';	
    var cUserList = userList ? '#3FFF00' : '#ED1C24';
    var cUI = UI2 ? '#3FFF00' : '#ED1C24';
    $('#plugbot-ui').append(
        '<p id="plugbot-btn-woot" style="color:' + cWoot + '">auto-woot</p>'
        +'<p id="plugbot-btn-queue" style="color:' + cQueue + '">auto-queue</p>'
        +'<p id="plugbot-btn-hidevideo" style="color:' + cHideVideo + '">hide video</p>'
        +'<p id="plugbot-btn-skipvideo" style="color:#ED1C24">skip video</p>'
        +'<p id="plugbot-btn-userlist" style="color:' + cUserList + '">userlist</p>');
    $('#plugbot-ui2').append(
    '<p id="plugbot-btn-UI" style="color:' + cUI + '">UI On</p>');

}

/**
 * For every button on the Plug.bot UI, we have listeners backing them
 * that are built to intercept the user's clicking each button.  Based
 * on the button that they clicked, we can execute some logic that will
 * in some way affect their experience.
 */
function initUIListeners() 
{
        /*
     * Toggle userlist.
     */
    $('#plugbot-btn-userlist').on("click", function() 
    {
        userList = !userList;
        $(this).css('color', userList ? '#3FFF00' : '#ED1C24');
        $('#plugbot-userlist').css('visibility', userList ? 'visible' : 'hidden');
        
        if (!userList) 
        {
            $('#plugbot-userlist').empty();
        } 
        else 
        {
            time_last=0;
            populateUserlist();
        }
        jaaulde.utils.cookies.set(COOKIE_USERLIST, userList);
    });

    /*
     * Toggle auto-woot.
     */
    $('#plugbot-btn-woot').on('click', function() 
	{
        autowoot = !autowoot;
        $(this).css('color', autowoot ? '#3FFF00' : '#ED1C24');
		
        if (autowoot) 
		{
            $('#button-vote-positive').click();
        }
		
        jaaulde.utils.cookies.set(COOKIE_WOOT, autowoot);
    });

    /*
     * Toggle hide video.
     */
    $('#plugbot-btn-hidevideo').on('click', function() 
	{
        hideVideo = !hideVideo;
        $(this).css('color', hideVideo ? '#3FFF00' : '#ED1C24');
	$(this).text(hideVideo ? 'hiding video' : 'hide video');
        $('#yt-frame').animate(
		{
            'height': (hideVideo ? '0px' : '271px')
        }, 
		{
            duration: 'fast'
        });
        $('#playback .frame-background').animate(
		{
            'opacity': (hideVideo ? '0' : '0.91')
        }, 
		{
            duration: 'medium'
        });
        jaaulde.utils.cookies.set(COOKIE_HIDE_VIDEO, hideVideo);
    });
	
	/*
	 * Skip the current video.
	 */
	$('#plugbot-btn-skipvideo').on('click', function()
	{
		skippingVideo = !skippingVideo;
		$(this).css('color', skippingVideo ? '#3FFF00' : '#ED1C24');
		$(this).text(skippingVideo ? 'skipping video' : 'skip video');
		if (hideVideo == skippingVideo)
			{
			$('#button-sound').click();
		}
		else
			{
			$('#plugbot-btn-hidevideo').click();
			$('#button-sound').click();
		}

	});
    /*
     * Toggle the UI
     */
    $('#plugbot-btn-UI').on('click', function()
    {
        UI2 = !UI2;
        $(this).css('color', UI2 ? '#33FFF0' : '#ED1C24');
        $(this).text(UI2 ? 'UI On' : 'UI Off');
        $('#plugbot-ui').css('visibility', UI2 ? 'visible' : 'hidden');
        jaaulde.utils.cookies.set(COOKIE_UI, UI2);

   });  
    /*
     * Toggle auto-queue/auto-DJ.
     */
    $('#plugbot-btn-queue').on('click', function() 
	{
        autoqueue = !autoqueue;
        $(this).css('color', autoqueue ? '#3FFF00' : '#ED1C24');
		
        if (autoqueue && !isInQueue()) 
		{
            joinQueue();
        }
        jaaulde.utils.cookies.set(COOKIE_QUEUE, autoqueue);
    });
}

/**
 * Called whenever a new DJ begins playing in the room.
 *
 * @param obj
 * 				This contains the current DJ's data.
 */
function djAdvanced(obj) 
{
    /*
     * If they want the video to be hidden, be sure to re-hide it.
     */
    if (hideVideo) 
	{
        $('#yt-frame').css('height', '0px');
        $('#playback .frame-background').css('opacity', '0.0');
    }
	
	if (skippingVideo)
	{
		$('#plugbot-btn-skipvideo').css('color', '#ED1C24').text('skip video');
		$('#button-sound').click();
		skippingVideo = false;
	}

    /*
     * If auto-woot is enabled, WOOT! the song.
     */
    if (autowoot) 
	{
        $('#button-vote-positive').click();
    }
        populateUserlist();
}

/**
 * Called whenever a change happens to the queue.
 */
function queueUpdate() 
{
    /*
     * If auto-queueing has been enabled, and we are currently
     * not in the waitlist, then try to join the list.
     */
    if (autoqueue && !isInQueue()) 
	{
        joinQueue();
    }
    time_last = 0;
    populateUserlist();
}

/**
 * Checks whether or not the user is already in queue.
 *
 * @return True if the user is in queue, else false.
 */
function isInQueue() 
{
    return API.getBoothPosition() !== -1 || API.getWaitListPosition() !== -1;
}

/**
 * Tries to add the user to the queue or the booth if there is no queue.
 *
 */
function joinQueue() 
{
    if ($('#button-dj-play').css('display') === 'block') 
	{
        $('#button-dj-play').click();
    } 
	else if (API.getWaitList().length < MAX_USERS_WAITLIST) 
	{
       API.djJoin();
    }
}

/**
 * Generates every user in the room and their current vote as
 * colour-coded text.  Also, moderators get the star next to
 * their name.
 */
function populateUserlist() 
{
    var date = new Date();
    var tick = date.getTime();
    date = null;
    clearTimeout(timeout_update);
    if(tick - time_last >= interval_update){
        time_last = tick;
    }
    else{
        timeout_update = setTimeout(function(){
            populateUserlist();
        }, interval_update);
        return;
    }
    /*
     * Destroy the old userlist DIV and replace it with a fresh
     * empty one to work with.
     */
    $('#plugbot-userlist').html(' ');

    /*
     * Update the current # of users in the room.
     */
    $('#plugbot-userlist').append('<h1 style="text-indent:12px;color:#42A5DC;font-size:14px;font-variant:small-caps;">Users: ' + API.getUsers().length + '</h1>');

    /*
     * Disclaimer that yes, you can now mention people from the
     * userlist!
     */
    $('#plugbot-userlist').append('<p style="padding-left:12px;text-indent:0px !important;font-style:italic;color:#00FFFF;font-size:11px;">Click a username to<br />mention them</p><br />');

    /*
     * If the user is in the waitlist, show them their current spot.
     */
     var spot = API.getWaitListPosition();
            $('#plugbot-userlist').append('<h1 id="plugbot-queuespot"><span style="font-variant:small-caps">Waitlist:</span> ' + (spot != -1 ? spot + ' / ' : '')+API.getWaitList().length + '</h3><br />');
    /*
     * An array of all of the room's users.
     */
    var users = new Array();

    /*
     * Populate the users array with the next user
     * in the room (this is stored alphabetically.)
     */
    for (var user in API.getUsers()) 
	{
        users.push(API.getUsers()[user]);
    }

    /*
     * For every user, call the #appendUser(username, vote) method
     * which will display their username with any colour coding that
     * they match.
     */
    for (user in users) 
	{
        var user = users[user];
        appendUser(user);
    }
}

/**
 * Appends another user's username to the userlist.
 *
 * @param username
 * 				The username of this user.
 * @param vote
 * 				Their current 'vote', which may be:
 * 					-1 	: Meh
 *					0	: 'undecided' (hasn't voted yet)
 * 					1	: WOOT!
 */
function appendUser(user) 
{
    var username = user.username;
    /*
     * A new feature to Pepper, which is a permission value,
     * may be 1-5 afaik.
     *
     * 1: normal (or 0)
     * 2: bouncer
     * 3: manager
     * 4/5: (co-)host
     */
    var permission = user.permission;

    /*
     * If they're an admin, set them as a fake permission,
     * makes it easier.
     */
    if (user.admin) 
	{
        permission = 99;
    }

    /*
     * For special users, we put a picture of their rank
     * (the star) before their name, and colour it based
     * on their vote.
     */
    var imagePrefix;
    switch (permission) 
	{
        case 0:
            imagePrefix = 'normal';
            break;
        case 1:
            imagePrefix = 'featured';
            break;
        case 2:
            imagePrefix = 'bouncer';
            break;
        case 3:
            imagePrefix = 'manager';
            break;
        case 4:
        case 5:
            imagePrefix = 'host';
            break;
        case 99:
            imagePrefix = 'admin';
            break;
    }

    /*
     * If they're the current DJ, override their rank
     * and show a different colour, a shade of blue,
     * to denote that they're playing right now (since
     * they can't vote their own song.)
     */
    if (API.getDJs().length>0 && API.getDJs()[0].username == username) 
	{
        if (imagePrefix === 'normal') 
		{
            drawUserlistItem('void', '#42A5DC', username);
        } 
		else 
		{
            drawUserlistItem(imagePrefix + '_current.png', '#42A5DC', username);
        }
    } 
	else if (imagePrefix === 'normal') 
	{
        /*
         * If they're a normal user, they have no special icon.
         */
        drawUserlistItem('void', colorByVote(user.vote), username);
    } 
	else 
	{
        /*
         * Otherwise, they're ranked and they aren't playing,
         * so draw the image next to them.
         */
        drawUserlistItem(imagePrefix + imagePrefixByVote(user.vote), colorByVote(user.vote), username);
    }
}

/**
 * Determine the color of a person's username in the
 * userlist based on their current vote.
 *
 * @param vote
 * 				Their vote: woot, undecided or meh.
 */
function colorByVote(vote) 
{
    if (!vote) 
	{
        return '#fff'; // blame Boycey
    }
    switch (vote) 
	{
        case -1:	// Meh
            return '#c8303d';
        case 0:	// Undecided
            return '#fff';
        case 1:	// Woot
            return '#c2e320';
    }
}

/**
 * Determine the "image prefix", or a picture that
 * shows up next to each user applicable in the userlist.
 * This denotes their rank, and its color is changed
 * based on that user's vote.
 *
 * @param vote
 * 				Their current vote.
 * @returns
 * 				The varying path to the PNG image for this user,
 * 				as a string.  NOTE:  this only provides the suffix
 * 				of the path.. the prefix of the path, which is
 * 				admin_, host_, etc. is done inside {@link #appendUser(user)}.
 */
function imagePrefixByVote(vote) 
{
    if (!vote) 
	{
        return '_undecided.png'; // blame boycey again
    }
    switch (vote) 
	{
        case -1:
            return '_meh.png';
        case 0:
            return '_undecided.png';
        case 1:
            return '_woot.png';
    }
}

/**
 * Draw a user in the userlist.
 *
 * @param imagePath
 * 				An image prefixed by their username denoting
 * 				rank; bouncer/manager/etc. 'void' for normal users.
 * @param color
 * 				Their color in the userlist, based on vote.
 * @param username
 * 				Their username.
 */
function drawUserlistItem(imagePath, color, username) 
{
    /*
     * If they aren't a normal user, draw their rank icon.
     */
    if (imagePath !== 'void') 
	{
        var realPath = 'http://www.theedmbasement.com/basebot/userlist/' + imagePath;
        $('#plugbot-userlist').append('<img src="' + realPath + '" align="left" style="margin-left:6px;margin-top:2px" />');
    }

    /*
     * Write the HTML code to the userlist.
     */
     if(API.getDJs().length > 0)
     {
    $('#plugbot-userlist').append(
        '<p style="cursor:pointer;' + (imagePath === 'void' ? '' : 'text-indent:6px !important;') + 'color:' + color + ';' + ((API.getDJs()[0].username == username) ? 'font-size:15px;font-weight:bold;' : '') + '" onclick="$(\'#chat-input-field\').val($(\'#chat-input-field\').val() + \'@' + username + ' \').focus();">' + username + '</p>');
}
}


///////////////////////////////////////////////////////////
////////// EVERYTHING FROM HERE ON OUT IS INIT ////////////
///////////////////////////////////////////////////////////

/*
 * Clear the old code so we can properly update everything.
 */
$('#plugbot-userlist').remove();
$('#plugbot-css').remove();
$('#plugbot-js').remove();


/*
 * Include cookie library
 *
 * TODO Replace with equivalent jQuery, I'm sure it's less work than this
 */
var head = document.getElementsByTagName('head')[0];
var script = document.createElement('script');
script.type = 'text/javascript';
script.src = 'http://cookies.googlecode.com/svn/trunk/jaaulde.cookies.js';
script.onreadystatechange = function() 
{
    if (this.readyState == 'complete') 
	{
        readCookies();
    }
}
script.onload = readCookies;
head.appendChild(script);


/**
 * Read cookies when the library is loaded.
 */
function readCookies() 
{
    /*
     * Changing default cookie settings
     */
    var currentDate = new Date();
    currentDate.setFullYear(currentDate.getFullYear() + 1); //Cookies expire after 1 year
    var newOptions = 
	{
        expiresAt: currentDate
    }
    jaaulde.utils.cookies.setOptions(newOptions);

    /*
     * Read Auto-Woot cookie (true by default)
     */
    var value = jaaulde.utils.cookies.get(COOKIE_WOOT);
    autowoot = value != null ? value : true;

    /*
     * Read Auto-Queue cookie (false by default)
     */
    value = jaaulde.utils.cookies.get(COOKIE_QUEUE);
    autoqueue = value != null ? value : false;

    /*
     * Read hidevideo cookie (false by default)
     */
    value = jaaulde.utils.cookies.get(COOKIE_HIDE_VIDEO);
    hideVideo = value != null ? value : false;
 /*
   * Read UI cookie (true by default)
   */
   value = jaaulde.utils.cookies.get(COOKIE_UI);
   UI2 = value != null ? value : true;
   
   onCookiesLoaded();

}

/*
 * Write the CSS rules that are used for components of the
 * Plug.bot UI.
 */
$('body').prepend('<style type="text/css" id="plugbot-css">'
    +'#plugbot-ui { position: absolute; margin-top:280px;}'
    +'#plugbot-ui p {height: 32px; padding-top: 8px; padding-left: 8px; padding-right: 6px; cursor: pointer; font-variant: small-caps; width: 84px; font-size: 15px; margin: 0; }#plugbot-ui h2 { background-color: #0b0b0b; height: 112px; width: 156px; margin: 0; color: #fff; font-size: 13px; font-variant: small-caps; padding: 8px 0 0 12px; border-top: 1px dotted #292929;}'
    +'#plugbot-userlist {  width: 17%; position:absolute; top:240px;left:-230px;border-right:thick outset #00FFFF;background-color:rgba(255,0,0,0.5);visibility:hidden;}'
    +'#plugbot-userlist:hover {  width: 17%;  position:absolute; top:240px; left:1px; float:right;}'
    +'#plugbot-userlist p { margin: 0; padding-top: 4px; text-indent: 24px; font-size: 11px; }'
    +'#plugbot-userlist p:first-child { padding-top: 0px !important; }'
    +'#plugbot-queuespot { color: #0000FF; text-align: left; font-size: 15px; margin-left: 8px }' 
    +'#plugbot-btn-queue {position:absolute;left:98px;top:0px;}'
    +'#plugbot-btn-hidevideo {position:absolute;left:196px;top:0px;}'
    +'#plugbot-btn-userlist {position:absolute;left:283px;top:0px;}'
    +'#plugbot-btn-UI {position:absolute;right:-46px;top:40px;cursor: pointer; font-variant:small-caps;font-size:15px;}'

);
$('body').append('<div id="plugbot-userlist"></div>');


/**
 * Continue initialization after user's settings are loaded
 */
function onCookiesLoaded() 
{
    /*
     * Hit the woot button, if autowoot is enabled.
     */
    if (autowoot) 
	{
        $('#button-vote-positive').click();
    }

    /*
     * Auto-queue, if autoqueue is enabled and the list is not full yet.
     */

    if (autoqueue && !isInQueue()) 
	{
        joinQueue();
    }

    /*
     * Hide video, if hideVideo is enabled.
     */
    if (hideVideo) 
	{
        $('#yt-frame').animate(
		{
            'height': (hideVideo ? '0px' : '271px')
        }, 
		{
            duration: 'fast'
        });
        $('#playback .frame-background').animate(
		{
            'opacity': (hideVideo ? '0' : '0.91')
        }, 
		{
            duration: 'medium'
        });
    }
    populateUserlist();
    /*
     * Call all init-related functions to start the software up.
     */
    initAPIListeners();
    displayUI();
    initUIListeners();
}
