var View = require('ampersand-view');
var templates = require('../templates');
var app = require('ampersand-app');
var PartitionButtonView = require('./partition-button');
var AggregateButtonView = require('./aggregate-button');


function facetFromEvent (view, ev) {
  var filter = view.model.filter;
  var dataset = filter.collection.parent;

  var facets = dataset.facets;

  var content = ev.dataTransfer.getData('text').split(':');

  if (content[0] === 'facet') {
    // a facet dropped from the facet bar
    ev.preventDefault();
    ev.stopPropagation();
    return facets.get(content[1]);
  }

  return null;
}

module.exports = View.extend({
  template: templates.includes.widgetFrame,
  initialize: function (opts) {
    var filter = this.model;

    // Create the actual chart model based on the data
    this.model = app.widgetFactory.newModel({
      modelType: filter.chartType,
      filter: filter,
      filterId: filter.id
    });

    // inform the filter on the number of partitions and aggregates
    filter.minPartitions = this.model.minPartitions;
    filter.maxPartitions = this.model.maxPartitions;
    filter.minAggregates = this.model.minAggregates;
    filter.maxAggregates = this.model.maxAggregates;
  },
  props: {
    showFacetBar: ['boolean', true, true]
  },
  derived: {
    // unique identifiers to hook up the mdl javascript
    _title_id: {
      deps: ['model.id'],
      fn: function () {
        return this.id + '_title';
      }
    },
    _partitionToolTipId: {
      deps: ['model.id'],
      fn: function () {
        return 'dropPartition:filter:' + this.model.filter.id;
      }
    },
    _aggregateToolTipId: {
      deps: ['model.id'],
      fn: function () {
        return 'dropAggregate:filter:' + this.model.filter.id;
      }
    }
  },
  bindings: {
    'model.filter.title': {
      type: 'value',
      hook: 'title-input'
    },
    'showFacetBar': [
      { type: 'toggle', hook: 'card-actions' },
      { type: 'toggle', hook: 'card-menu' }
    ],

    // link up mdl javascript behaviour on the page
    '_title_id': [
      { type: 'attribute', hook: 'title-input', name: 'id' },
      { type: 'attribute', hook: 'title-label', name: 'for' }
    ],
    '_partitionToolTipId': [
      { type: 'attribute', hook: 'partition-dropzone', name: 'id' },
      { type: 'attribute', hook: 'partition-dropzonett', name: 'for' }
    ],
    '_aggregateToolTipId': [
      { type: 'attribute', hook: 'aggregate-dropzone', name: 'id' },
      { type: 'attribute', hook: 'aggregate-dropzonett', name: 'for' }
    ]
  },
  events: {
    'click [data-hook~="close"]': 'closeWidget',
    'click [data-hook~="zoom-in"]': 'zoomIn',
    'click [data-hook~="zoom-out"]': 'zoomOut',
    'change [data-hook~="title-input"]': 'changeTitle',

    'drop [data-hook~="partition-dropzone"]': 'dropPartition',
    'drop [data-hook~="aggregate-dropzone"]': 'dropAggregate',
    'dragstart .facetDropZone': 'dragFacetStart',
    'dragover .facetDropZone': 'allowFacetDrop'
  },
  dragFacetStart: function (ev) {
    ev.dataTransfer.setData('text', ev.target.id);
  },
  allowFacetDrop: function (ev) {
    ev.preventDefault();
  },
  dropPartition: function (ev) {
    var facet = facetFromEvent(this, ev);
    if (!facet) {
      return;
    }

    var filter = this.model.filter;
    var partitions = filter.partitions;

    partitions.add({
      facetId: facet.getId(),
      rank: partitions.length + 1
    });
  },

  dropAggregate: function (ev) {
    var facet = facetFromEvent(this, ev);
    if (!facet) {
      return;
    }

    var filter = this.model.filter;
    var aggregates = filter.aggregates;

    // NOTE: as the default aggregation is by count,
    // the plot doesnt change and we do not have to reinit
    // the data filter yet. This assumes there is no missing data.
    aggregates.add({
      facetId: facet.getId(),
      rank: aggregates.length + 1
    });
  },
  zoomIn: function (ev) {
    var filter = this.model.filter;
    filter.zoomIn();
  },
  zoomOut: function () {
    var filter = this.model.filter;
    filter.zoomOut();
  },

  closeWidget: function () {
    // Remove the filter from the dataset
    var filters = this.model.filter.collection;
    filters.remove(this.model.filter);

    // Remove the view from the dom
    this.remove();
  },
  changeTitle: function (e) {
    this.model.filter.title = this.queryByHook('title-input').value;
  },
  render: function () {
    // this.setupDragDrop(interact);
    this.renderWithTemplate(this);
    this.renderCollection(this.model.filter.partitions, PartitionButtonView, this.queryByHook('partition-dropzone'));
    this.renderCollection(this.model.filter.aggregates, AggregateButtonView, this.queryByHook('aggregate-dropzone'));
    return this;
  },
  renderContent: function () {
    // Propagate to subview
    this.widget.renderContent();
  },
  subviews: {
    widget: {
      hook: 'widget',
      constructor: function (options) {
        options.model = options.parent.model; // NOTE: type is determined from options.model.modelType
        return app.viewFactory.newView(options);
      }
    }
  }
});
