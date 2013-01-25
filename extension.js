// This extension was developed by :
// * Andres Estevez http://andresestevez.blogspot.com/
// * Arnaud Bonatti https://github.com/Obsidien
//
// Licence: GPLv2+

const St = imports.gi.St;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const Lang = imports.lang;
const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Shell = imports.gi.Shell;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Widget = Me.imports.widget;

const Gettext = imports.gettext;
const _ = Gettext.domain('todolist').gettext;

let meta;
let todo;


// TasksManager function
function TasksManager(metadata)
{	
	this.file = metadata.path + "/list.tasks";
	let locales = metadata.path + "/locale";
	Gettext.bindtextdomain('todolist', locales);

        let filename = this.file;
	this._init(metadata.path + "/list.tasks");

}

// Prototype
TasksManager.prototype =
{
	__proto__: PanelMenu.Button.prototype,
	
    	_init: function(datafile) 
    	{
		PanelMenu.Button.prototype._init.call(this, St.Align.START);
                filename = datafile; // FIXME!
		this.buttonText = new St.Label({text:_("(...)")});
		this.buttonText.set_style("text-align:center;");
		this.actor.add_actor(this.buttonText);
		this.buttonText.get_parent().add_style_class_name("panelButtonWidth");
		values = []	
	        current_index = 0
	        this._get_values();
		this._refresh();
	},

        _next_phrase: function(o,e) {
	    current_index = (current_index + 1) % values.length;
	    item1.set_text(_(values[current_index][1]));
	    item2.set_text(_(values[current_index][0]));
	    labelCounter.set_text((current_index+1) + " / " + values.length);
	},

        _prev_phrase: function(o,e) {
	    if (current_index == 0) {
		current_index = values.length -1 ;
	    } else {
		current_index--;
	    }
    
	    item1.set_text(_(values[current_index][1]))
	    item2.set_text(_(values[current_index][0]))
	    
	    labelCounter.set_text((current_index+1) + " / " + values.length);
	},


        _new_phrase_handler: function(o,e) {
	    let symbol = e.get_key_symbol();
	    if (symbol == Clutter.Return)
	    {
		let foreign_word = entryNewTask.get_text();
		let translation_word = entryNewTranslation.get_text()
		
		if ((foreign_word != "") && (translation_word != "")) {		
  		    add_word_pair(foreign_word, translation_word, filename);
		    
		    values[values.length] = [foreign_word , translation_word]

		    entryNewTranslation.set_text('');
		    entryNewTask.set_text('');
		}
	    }
	},
   
        _get_values: function()
        {
	    if (GLib.file_test(this.file, GLib.FileTest.EXISTS))
	    {
		let content = Shell.get_file_contents_utf8_sync(this.file);
		
		let lines = content.toString().split('\n');
		
		for (let i=0; i<lines.length; i++)
 		{
		    // if not a comment && not empty
		    if (lines[i][0] != '#' && lines[i] != '' && lines[i] != '\n')
		    {
			var pair = lines[i].split("|");
			values[values.length] = [pair[0],pair[1]]
			
		    }
		}// for

	    }// GLib.file_test
		
	},

	_refresh: function()
	{
	    let tasksMenu = this.menu;
	    let buttonText = this.buttonText;

    	    // Clear
    	    tasksMenu.removeAll();
	    
	    let tasks = 0;
	    
	    buttonText.set_text("(" + tasks + ")");

	    item1 = new St.Label({text:_( values[current_index][1] ), style_class: 'item'})
	    item2 = new St.Label({text:_( values[current_index][0] ), style_class: 'item'})

	    labelCounter = new St.Label({text: (current_index+1) + " / " + values.length , style_class: 'item'})

	    let upperSection = new PopupMenu.PopupMenuSection();
	    upperSection.actor.add_actor(item1);
	    upperSection.actor.add_actor(item2);

	    // Separator
	    this.Separator = new PopupMenu.PopupSeparatorMenuItem();
	    tasksMenu.addMenuItem(this.Separator);
	    
	    // Bottom section
	    let bottomSection = new PopupMenu.PopupMenuSection();
	    
  	    this.entryForeign = new St.Entry(
  		{
		    name: "newTaskEntry",
		    style_class: 'langcardentry',
		    hint_text: _("<foreign>"),
		    track_hover: true,
		    can_focus: true
		});
	    
	    this.entryTranslation = new St.Entry(
                {
		    name: "translationEntry",
		    style_class: 'langcardentry',
		    hint_text: _("<translation>"),
		    track_hover: true,
		    can_focus: true
		});
	        
	    entryNewTranslation = this.entryTranslation.clutter_text;
	    entryNewTask = this.entryForeign.clutter_text;
	 
	    entryNewTask.connect('key-press-event', this._new_phrase_handler);
	    entryNewTranslation.connect('key-press-event', this._new_phrase_handler);
	    
	    bottomSection.actor.add_actor(this.entryTranslation);
    
            bottomSection.actor.add_style_class_name("newTaskSection");
	    bottomSection.actor.add_actor(this.entryForeign);
    
	    tasksMenu.addMenuItem(upperSection);
	    tasksMenu.addMenuItem(bottomSection);


            this._prevButton = new Widget.LangcardButton('media-skip-backward-symbolic',
							 Lang.bind(this, function () { this._prev_phrase(); }));

            this._nextButton = new Widget.LangcardButton('media-skip-forward-symbolic',
							 Lang.bind(this, function () { this._next_phrase(); }));
	    
            this.trackControls = new Widget.LangcardButtons();
	    this.trackControls.addButton(labelCounter);
            this.trackControls.addButton(this._prevButton);
            this.trackControls.addButton(this._nextButton);
	    
            tasksMenu.addMenuItem(this.trackControls);

	 },
	
	_enable: function()
	{		
		// Refresh menu
		let fileM = Gio.file_new_for_path(this.file);
		this.monitor = fileM.monitor(Gio.FileMonitorFlags.NONE, null);
		this.monitor.connect('changed', Lang.bind(this, this._refresh));
	},

	_disable: function()
	{
		this.monitor.cancel();
	},


    _dummy: function()
    {
	global.logError("PULSADA TECLA");
    },


} // class




// Add task "text" to file "file"
function add_word_pair(_foreign, _translation, file)
{

    if (GLib.file_test(file, GLib.FileTest.EXISTS))
    {
	let content = Shell.get_file_contents_utf8_sync(file);
	//	content = content + text + "\n";
	content = content + _foreign + "|" + _translation + "\n";
	global.logError(content);
	let f = Gio.file_new_for_path(file);
	let out = f.replace(null, false, Gio.FileCreateFlags.NONE, null);
	Shell.write_string_to_stream (out, content);
	out.close(null);
    }
    else 
    { 
	global.logError("Todo list : Error while reading file : " + file); 
    }
}// add_word_pair



// Remove task "text" from file "file"
function removeTask(text,file)
{
	if (GLib.file_test(file, GLib.FileTest.EXISTS))
	{
		let content = Shell.get_file_contents_utf8_sync(file);
		let tasks = content.toString().split('\n');
		let newText = "#tasks";
		
		for (let i=0; i<tasks.length; i++)
		{
			// if not corresponding
			if (tasks[i] != text)
			{
				if(tasks[i][0] != '#')
				{
					newText += "\n";
					newText += tasks[i];
				}
			}
		}
		
		let f = Gio.file_new_for_path(file);
		let out = f.replace(null, false, Gio.FileCreateFlags.NONE, null);
		Shell.write_string_to_stream (out, newText);
		out.close(null);
	}
	else 
	{ global.logError("Todo list : Error while reading file : " + file); }
}


// Init function
function init(metadata) 
{		
	meta = metadata;
}

function enable()
{
	todo = new TasksManager(meta);
	todo._enable();
	Main.panel.addToStatusArea('todo', todo);
}

function disable()
{
	todo._disable();
	todo.destroy();
	todo = null;
}
