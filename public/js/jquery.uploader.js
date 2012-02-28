;(function( $, window, document, undefined ){

	// our plugin constructor
	var Uploader = function( form, options ){
		this.form = form;
		this.$form = $(form);
		this.$upload = $('input[type="file"]', this.form);

		this.obs = options.observer || {publish:function(){}, subscribe:function(){}};

		this.options = options;

		// This next line takes advantage of HTML5 data attributes
		// to support customization of the plugin on a per-element
		// basis. For example,
		// <form data-plugin-options='{"message":"Goodbye World!"}'></form>
		this.metadata = this.$form.data( 'plugin-options' );


		this.fileId = $('input[name="fileId"]').val() || this.metadata.fileId

		this.$remove = null;		// the remove UI that will be generated after uploading
		this.$fContent = null; 		// form content wrapped into this element
		this.id = null; 			// random id generated to identify iframe and callback
		this.data = null;			// file data returned by file upload
	};

	// the uploader prototype
	Uploader.prototype = {
		defaults: {
			removeLabel: "Don't like it?",
			removeBtnText: "Remove file"
		},

		init: function() {
			// Introduce defaults that can be extended either 
			// globally or using an object literal. 
			this.config = $.extend({}, this.defaults, this.options, this.metadata);

			// Sample usage:
			// Set the message per instance:
			// $('#elem').uploader({ removeLabel: 'Delete File'});
			// or
			// var p = new Uploader(document.getElementById('elem'), 
			// { removeLabel: 'Delete File'}).init()
			// or, set the global default message:
			// Uploader.defaults.removeLabel = 'Delete File'

			this.hideSubmitBtn();
			this.wrapFormContent();
			this.iframeUpload();

			return this;
		},

		// Hides submit button and bind form submit 
		// on the input file's 'change' event
		hideSubmitBtn: function() {

			$('input[type="submit"]', this.$form).hide();	
			this.$upload.on('change.uploader', $.proxy(function(){
				this.$form.submit();	
			}, this));
		},

		wrapFormContent: function() {

			if (!this.$fContent) {
				this.$form.wrapInner('<div class="uploader-form-content">');
				this.$fContent = $('.uploader-form-content', this.$form);
			}
		},

		showRemoveButton: function() {

			// Hide form content
			this.$fContent.hide();

			if (!this.$remove) {

				this.$remove = $('<div class="uploader-remove">'
					+ '<label for="remove-'+this.id+'">'
					+ this.config.removeLabel
					+ '</label><br>'
					+ '<input type="button" id="remove-'+this.id+'" value="'+this.config.removeBtnText+'"/>'
					+ '</div>');

				$('input[type=button]', this.$remove).on('click.uploader', $.proxy(this.deleteFile, this));
			}
			this.$form.append(this.$remove);
		},

		hideRemoveButton: function() {
			this.$remove.detach();
			this.$fContent.show();
		},

		deleteFile: function() {
			console.log('ask for delete');
			var jqXhr = $.post(this.config.removeUrl, {
				file: this.data.file
			})

			jqXhr
				.fail(function(){
					console.log('delete file error:', arguments);
				})
				.done($.proxy(function(){
					this.hideRemoveButton();
					this.data = null;

					// Notify Observer
					this.obs.publish('removed.uploader', this.fileId);
				}, this));
		},

		// Faking AJAX post with iframe
		iframeUpload: function() {

			this.$form.on('submit.uploader', $.proxy(function(){

				var id, cb, iframe, url;
				
				// Generating a random id to identify
				// both the iframe and the callback function
				this.id = Math.floor(Math.random() * 1000);
				id = "uploader-frame-" + this.id;
				cb = "uploader-cb-" + this.id;

				// creating iframe and callback
				iframe = $('<iframe id="'+id+'" name="'+id+'" style="display:none;">');
				url = this.$form.attr('action');

				this.$form
					.attr('target', id)
					.append(iframe)
					.attr('action', url + '?iframe=' + cb);
				
				// defining callback
				window[cb] =  $.proxy(function(data) {
					console.log('received callback:', data);

					// saving data
					this.data = data;

					// removing iframe
					iframe.remove();
					this.$form.removeAttr('target');
					
					// removing callback
					this.$form.attr('action', url);
					window[cb] = undefined;

					this.showRemoveButton();

					// Notify Observer
					this.obs.publish('uploaded.uploader', this.fileId, this.data);

				}, this);

				// Notify Observer
				this.obs.publish('submit.uploader', this.fileId);

			}, this));
		}
	}

	Uploader.defaults = Uploader.prototype.defaults;

	$.fn.uploader = function(options) {
		return this.each(function() {
			new Uploader(this, options).init();
		});
	};

	//optional: window.Uploader = Uploader;

})( jQuery, window , document );