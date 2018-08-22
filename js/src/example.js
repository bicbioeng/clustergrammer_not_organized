var widgets = require('jupyter-js-widgets');
var _ = require('underscore');
var d3 = require('d3')
var cgm_fun = require('clustergrammer');
var cgm_fun2 = require('clustergrammer-gl');
// var cgm_fun3 = require('./clustergrammer-gl-local');
var ini_hzome = require('./hzome_functions');
var Enrichrgram = require('./Enrichrgram');
var url = require("file-loader!./clustergrammer_logo.png");

// version 0.3.1
console.log('************************************************')
console.log('clustergrammer_glidget!! version 0.4.0')
console.log('running webpack 1.1.5')
console.log('************************************************')

require('!style!css!./custom.css');

// Custom Model. Custom widgets models must at least provide default values
// for model attributes, including `_model_name`, `_view_name`, `_model_module`
// and `_view_module` when different from the base class.
//
// When serialiazing entire widget state for embedding, only values different from the
// defaults will be specified.
var hello_model = widgets.DOMWidgetModel.extend({
  defaults: _.extend({}, widgets.DOMWidgetModel.prototype.defaults, {
    _view_name : 'hello_view',
    _model_name : 'hello_model',
    _view_module : 'clustergrammer_glidget',
    _model_module : 'clustergrammer_glidget',
    viz_title : 'default value',
    network: ''
  })
});


// Custom View. Renders the widget model.
var hello_view = widgets.DOMWidgetView.extend({

  render: render_function,

  value_changed: function() {

    // this.el.textContent = this.model.get('viz_title');
    // var inst_network_string = this.model.get('network');
    // inst_network = JSON.parse(inst_network_string);
    // d3.select(this.el)
    //   .classed('.widget_viz',true);

  }
});

function render_function() {

  // generate unique id for each visualization
  var viz_number = String(Math.round(Math.random()*10000));
  var container_name = 'cgm_notebook_' + String(viz_number) ;
  if (d3.select('#'+container_name).empty() === false){
    var backup_number = String(Math.round(Math.random()*10000));
    container_name = container_name + backup_number;
  }

  // widget-subarea appears to be limited to a width of ~960px in nbviewer
  d3.select(this.el)
      .append('div')
      .classed('clustergrammer_glidget', true)
      .attr('id', container_name)
      .style('width', '975px')
      .style('height', '975px');

  console.log('making square canvas!!!');

  var inst_network_string = this.model.get('network');

  inst_network = JSON.parse(inst_network_string);

  var about_string = "<a href='http://clustergrammer.readthedocs.io/clustergrammer_glidget.html' target='_blank' ><img src='http://amp.pharm.mssm.edu/clustergrammer/static/img/clustergrammer_logo.png' style='width:130px; margin-left:-5px' alt='clustergrammer'></a>";

  var hzome = ini_hzome();

  // cgm_model needs to be global
  cgm_model = this;

  var container_id = '#'+container_name;

  var inst_container = document.getElementById(container_name)

  console.log('container_name', container_name)
  console.log('inst_container', inst_container)

  // define arguments object
  var args = {
      // root: container_id,
      'container_name': container_name,
      // 'container': inst_container,
      'network': inst_network,
      'about':about_string,
      'row_tip_callback':hzome.gene_info,
      'matrix_update_callback':matrix_update_callback,
      'cat_update_callback': cat_update_callback,
      'sidebar_width':135,
  };

  setTimeout(make_viz, 10, args);

}

function make_viz(args){

  /*
  selecting the container here, but not earlier, works. not sure why
  */

  var inst_container_2 = document.getElementById(args.container_name)

  console.log('inst_container_2', inst_container_2)

  args.container = inst_container_2;
  // debugger

  // // clustergrammer-js npm
  // cgm = cgm_fun(args);

  // clustergrammer-gl npm
  cgm = cgm_fun2(args)

  // // local version ;
  // cgm = cgm_fun3(args);

  // check_setup_enrichr(cgm);

  // console.log('DO NOT UPDATE MATRIX STRING WHEN MAKING VIZ -- clustergrammer_glidget')

}

// hack to prevent matrix update string from running in nbviewer
var inst_url = window.location.href;
var in_nbviewer = false;
if (inst_url.indexOf('nbviewer.jupyter.org') > 0){
  in_nbviewer = true;
}

// Enrichrgram specific functions
///////////////////////////////////////////////////////////////

function matrix_update_callback(){

  console.log('matrix_update_callback')

  if (in_nbviewer === false){
    // wait to update matrix string until updating has finished
    setTimeout(update_matrix_string, 1500);
  }

  if (genes_were_found[this.root]){
    enr_obj[this.root].clear_enrichr_results();
  }

}

function cat_update_callback(){
  if (in_nbviewer === false){
    setTimeout(update_matrix_string, 1500);
  }
}

function update_matrix_string(){
  console.log('*** update matrix string')
  // update model with matrix string
  var inst_mat_string = cgm.export_matrix_string();
  cgm_model.model.set("mat_string", inst_mat_string);
  cgm_model.touch();
}


var genes_were_found = {};
enr_obj = {};



function run_ini_enrichr(inst_cgm){

  var inst_root = inst_cgm.params.root;

  var has_enrichrgram = _.has(inst_cgm.params.network_data, 'enrichrgram');

  var make_enrichrgram = false;
  if (has_enrichrgram){
    make_enrichrgram = inst_cgm.params.network_data.enrichrgram;
  }

  if (genes_were_found[inst_root] || make_enrichrgram){

    if (d3.select(inst_root + ' .enrichr_logo').empty()){

      // set up Enrichr category import
      enr_obj[inst_root] = Enrichrgram(inst_cgm);
      enr_obj[inst_root].enrichr_icon();

      // set up Enrichr export in dendro modal
      //////////////////////////////////////////

      // only display for rows
      var enrichr_section = d3.selectAll(inst_root + ' .dendro_info')
        .select('.modal-body')
        .append('div')
        .classed('enrichr_export_section', true)
        .style('margin-top', '10px')
        // .style('display','none');

      enrichr_section
        .append('text')
        .text('Send genes to ');

      enrichr_section
        .append('a')
        .html('Enrichr')
        .on('click', function(){

          var group_string = d3.select(inst_root + ' .dendro_text input').attr('value');

          // replace all instances of commas with new line
          var gene_list = group_string.replace(/, /g, '\n');

          ///////////////
          // clean list
          ///////////////
          var enrichr_info = {list: gene_list, description: 'Clustergrammer gene-cluster list' , popup: true};

          // defined globally - will improve
          send_to_Enrichr(enrichr_info);

        });

    }

  }

}

function check_gene_request(inst_cgm, gene_symbol, run_ini_enrichr){

  if (gene_symbol.indexOf(' ') > 0){
    gene_symbol = gene_symbol.split(' ')[0];
  } else if (gene_symbol.indexOf('_') > 0){
    gene_symbol = gene_symbol.split('_')[0];
  }


  var base_url = 'https://amp.pharm.mssm.edu/Harmonizome/api/1.0/gene/';
  var url = base_url + gene_symbol;

  if (genes_were_found[inst_cgm.params.root] === false){

    // make sure value is non-numeric
    if (isNaN(gene_symbol)){

      $.get(url, function(data) {

        data = JSON.parse(data);

        if (data.name != undefined){
          genes_were_found[inst_cgm.params.root] = true;
        }

        run_ini_enrichr(inst_cgm, gene_symbol);

      });

    }
  }

}

function send_to_Enrichr(options) { // http://amp.pharm.mssm.edu/Enrichr/#help
    var defaultOptions = {
    description: "",
    popup: false
  };

  if (typeof options.description == 'undefined')
    options.description = defaultOptions.description;
  if (typeof options.popup == 'undefined')
    options.popup = defaultOptions.popup;
  if (typeof options.list == 'undefined')
    alert('No genes defined.');

  var form = document.createElement('form');
  form.setAttribute('method', 'post');
  form.setAttribute('action', 'https://amp.pharm.mssm.edu/Enrichr/enrich');
  if (options.popup)
    form.setAttribute('target', '_blank');
  form.setAttribute('enctype', 'multipart/form-data');

  var listField = document.createElement('input');
  listField.setAttribute('type', 'hidden');
  listField.setAttribute('name', 'list');
  listField.setAttribute('value', options.list);
  form.appendChild(listField);

  var descField = document.createElement('input');
  descField.setAttribute('type', 'hidden');
  descField.setAttribute('name', 'description');
  descField.setAttribute('value', options.description);
  form.appendChild(descField);

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}

function abort_request(inst_request){
  console.log('ABORTING REQUEST');
  inst_request.abort();
}

module.exports = {
  hello_model : hello_model,
  hello_view : hello_view
};
