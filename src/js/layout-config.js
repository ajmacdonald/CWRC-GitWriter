'use strict';

var $ = require('jquery');

require('layout');
require('jquery-ui/ui/widgets/tabs');

function Layout(w) {
    this.w = w;
    this.ui = null;
    this.mode = null; // 'reader' or 'annotator'
}

Layout.prototype = {
    constructor: Layout,
    
    /**
     * Initialize the layout
     * @param {jQuery|Element} container The container that will contain the layout
     * @param {String} textareaId The ID to assign to the editor textarea
     * @returns jquery-ui class
     */
    init: function(container, textareaId) {
        var cwrcName = 'CWRC-Writer';
        var version = '0.9';
        var southTabs = ''+
        '<div class="cwrc ui-layout-south">'+
            '<div id="southTabs" class="tabs">'+
                '<ul>'+
                    '<li><a href="#validation">Validation</a></li>'+
                    '<li><a href="#selection">Markup</a></li>'+
                '</ul>'+
                '<div id="southTabsContent" class="ui-layout-content"></div>'+
            '</div>'+
        '</div>';
        if (this.w.isReadOnly) {
            this.mode = 'reader';
            cwrcName = 'CWRC-Reader';
            southTabs = '';
        }
        $(container).html(
            '<div id="cwrc_loadingMask" class="cwrc"><div>Loading '+cwrcName+'</div></div>'+
            '<div id="cwrc_wrapper">'+
                '<div id="cwrc_header" class="cwrc ui-layout-north">'+
                    '<div id="headerParent" class="ui-widget">'+
                        '<a id="titleLink" href="http://www.cwrc.ca" target="_blank">'+cwrcName+' v.'+version+'</a>'+
                        '<div id="headerButtons"></div>'+
                    '</div>'+
                '</div>'+
                '<div class="cwrc ui-layout-west">'+
                    '<div id="westTabs" class="tabs">'+
                        '<ul>'+
                            '<li><a href="#entities">Entities</a></li>'+
                            '<li><a href="#structure">Structure</a></li>'+
                            '<li><a href="#relations">Relations</a></li>'+
                        '</ul>'+
                        '<div id="westTabsContent" class="ui-layout-content">'+
                            '<div id="entities"></div>'+
                            '<div id="structure"></div>'+
                            '<div id="relations"></div>'+
                        '</div>'+
                    '</div>'+
                '</div>'+
                '<div id="cwrc_main" class="ui-layout-center">'+
                    '<div class="ui-layout-center">'+
                        '<form method="post" action="">'+
                            '<textarea id="'+textareaId+'" name="editor" class="tinymce"></textarea>'+
                        '</form>'+
                    '</div>'+
                    southTabs+
                '</div>'+
            '</div>'
        );
        
        this.ui = $('#cwrc_wrapper').layout({
            defaults: {
                maskIframesOnResize: true,
                resizable: true,
                slidable: false,
                fxName: 'none' // 'slide'
            },
            north: {
                size: 35,
                spacing_open: 0,
                minSize: 35,
                maxSize: 60,
                closable: false
            },
            west: {
                size: 'auto',
                minSize: 325,
                onresize_end: function(region, pane, state, options) {
                    var borderHeight = $('#westTabs').outerHeight() - $('#westTabs').height();
                    var tabsHeight = $('#westTabs > ul').outerHeight();
                    $('#westTabsContent').height(state.layoutHeight - (tabsHeight+borderHeight));
//                    $.layout.callbacks.resizeTabLayout(region, pane);
                }
            }
        });
        
        this.ui.panes.center.layout({
            defaults: {
                maskIframesOnResize: true,
                resizable: true,
                slidable: false
            },
            center: {
                onresize_end: function(region, pane, state, options) {
                    var $container = $(this.w.editor.getContainer());
                    
                    var outerBorderWidth = $container.outerWidth()-$container.width();
                    $container.width(state.layoutWidth - outerBorderWidth);
                    
                    var outerBorderHeight = $container.outerHeight()-$container.height();
                    var innerBorderHeight = $container.find('.mce-edit-area').outerHeight()-$container.find('.mce-edit-area').height();
                    var uiHeight = outerBorderHeight + innerBorderHeight;
                    var toolbar = $container.find('.mce-toolbar-grp');
                    if (toolbar.is(':visible')) {
                        uiHeight += toolbar.outerHeight();
                    }
                    $('iframe', this.w.editor.getContainer()).height(state.layoutHeight - uiHeight);
                }.bind(this)
            },
            south: {
                size: 250,
                resizable: true,
                initClosed: true,
                activate: function(event, ui) {
                    $.layout.callbacks.resizeTabLayout(event, ui);
                },
                onresize_end: function(region, pane, state, options) {
                    var borderHeight = $('#southTabs').outerHeight() - $('#southTabs').height();
                    var tabsHeight = $('#southTabs > ul').outerHeight();
                    $('#southTabsContent').height(state.layoutHeight - (tabsHeight+borderHeight));
                }
            }
        });
        
        this.w.layoutModules.addStructureTreePanel(this.w, 'structure');
        this.w.layoutModules.addEntitiesListPanel(this.w, 'entities');
        this.w.layoutModules.addRelationsListPanel(this.w, 'relations');
        
        if (!this.w.isReadOnly) {
            this.w.layoutModules.addValidationPanel(this.w, 'southTabsContent');
            this.w.layoutModules.addSelectionPanel(this.w, 'southTabsContent');

        }
        
        $('#westTabs').tabs({
            active: 1,
            activate: function(event, ui) {
                $.layout.callbacks.resizeTabLayout(event, ui);
            },
            create: function(event, ui) {
                $('#westTabs').parent().find('.ui-corner-all:not(button)').removeClass('ui-corner-all');
            }
        });
        if (!this.w.isReadOnly) {
            $('#southTabs').tabs({
                active: 1,
                activate: function(event, ui) {
                    $.layout.callbacks.resizeTabLayout(event, ui);
                },
                create: function(event, ui) {
                    $('#southTabs').parent().find('.ui-corner-all:not(button)').removeClass('ui-corner-all');
                }
            });
        }
        
        var isLoading = false;
        var doneLayout = false;
        
        var onLoad = function() {
            isLoading = true;
            this.w.event('loadingDocument').unsubscribe(onLoad);
        }.bind(this);
        var onLoadDone = function() {
            isLoading = false;
            if (doneLayout) {
                $('#cwrc_loadingMask').fadeOut();
                this.w.event('documentLoaded').unsubscribe(onLoadDone);
                doResize();
            }
        }.bind(this);
        var doResize = function() {
            this.ui.options.onresizeall_end = function() {
                doneLayout = true;
                if (isLoading === false) {
                    $('#cwrc_loadingMask').fadeOut();
                    this.ui.options.onresizeall_end = null;
                }
                if (this.w.isReadOnly) {
                    if ($('#annotateLink').length === 0) {
                        $('#headerLink').hide();
                        $('#headerButtons').append('<div id="annotateLink"><h2>Annotate</h2></div>');
                        
                        $('#annotateLink').click(function(e) {
                            if (this.mode === 'reader') {
                                // TODO check credentials
                                this.activateAnnotator();
                                $('h2', e.currentTarget).text('Read');
                            } else {
                                this.activateReader();
                                $('h2', e.currentTarget).text('Annotate');
                            }
                        }.bind(this));
                        
                        this.w.settings.hideAdvanced();
                        
                        this.activateReader();
                    }
                }
            }.bind(this);
            this.ui.resizeAll(); // now that the editor is loaded, set proper sizing
        }.bind(this);
        
        this.w.event('loadingDocument').subscribe(onLoad);
        this.w.event('documentLoaded').subscribe(onLoadDone);
        this.w.event('writerInitialized').subscribe(doResize);
        
        return this.ui;
    },
    
    activateReader: function() {
        this.w.isAnnotator = false;
        this.ui.open('west');
        this.w.hideToolbar();
        
        this.w.editor.plugins.cwrc_contextmenu.disabled = true;
        
        this.mode = 'reader';
    },
    
    activateAnnotator: function() {
        this.w.isAnnotator = true;
        this.ui.open('west');
        this.w.showToolbar();
        
        this.w.editor.plugins.cwrc_contextmenu.disabled = false;
        this.w.editor.plugins.cwrc_contextmenu.entityTagsOnly = true;
        
        this.mode = 'annotator';
    }
}

module.exports = Layout;