import React, {Component} from 'react';

import ngraph from 'ngraph.graph'
import getGraphDiameter from './bfs'
import { diff } from 'deep-diff'
import { KINDS } from './constants'

class Graph extends Component {
  static defaultProps = {
    renderer: null,
    layout: null,
    autoConnectNodes: false,
    data: {
      relations: [],
      tables: [],
    },
    linkedOnly: false,
    settings: {
      maxSteps: 100,
    },
    eventBinding: {

    },
    extendedOptions: {

    },
  }

  constructor(props){
    super(props)
    this.graph = ngraph()
    this.state = {
      graph: this.graph,
      graphDiff:[],
    }
  }

  prepareGraph(graph, graphDiff=[], graphData, linkedOnly, autoConnectNodes, connectFarthestNodes){
    let nodesToBeAdded = [];
    let dimentionId=1;

    graphDiff.forEach(diff=>{
      if (diff.path && (diff.path[0]==='tables'||diff.path[0]==='relations')){
        if (diff.item.kind===KINDS.NEW){
          if (diff.path[0]==='tables'){
            const table = diff.item.rhs
            if (!linkedOnly){
              graph.addNode(table.name, table);
            }
          }else if (diff.path[0]==='relations'){
            const relation = Object.assign({},diff.item.rhs, {type:'dimention'})

            if (autoConnectNodes) {
              graph.addNode('dimention' + dimentionId, relation);
            }

            for (var index = 0; index < relation.connections.length; index++) {
              if (linkedOnly){
                const node = graph.getNode(relation.connections[index].TableName)
                if (!autoConnectNodes && node===undefined){
                  nodesToBeAdded.push(relation.connections[index].TableName)
                }
              }

              if (autoConnectNodes) {
                graph.addLink(
                  relation.connections[index].TableName,
                  'dimention' + dimentionId,
                  [relation.connections[index],{TableName:'dimention' + dimentionId}]
                );
              }
            }

            if (!autoConnectNodes) {
              relation.connections.forEach((connection)=>{
                relation.connections.forEach((connection2)=>{
                  if (connection2.TableName!==connection.TableName &&
                      !graph.getLink(connection2.TableName, connection.TableName) &&
                      !graph.getLink(connection.TableName, connection2.TableName)){
                    graph.addLink(
                      connection.TableName,
                      connection2.TableName,
                      [connection,{TableName:connection2.TableName}]
                    );
                  }
                });
              });
            }

            dimentionId++;
          }
        } else if (diff.item.kind===KINDS.DELETE){
          console.log('delete');
        }
      }
    })

    if (connectFarthestNodes) {
      this.connectFarthestNodesOfGraph(graph);
    }
    graphDiff
    .filter(diff=>{
      return diff.path && diff.path[0]==='tables' && nodesToBeAdded.includes(diff.item.rhs.name)
    })
    .forEach(diff=>{
      const table = diff.item.rhs
      graph.addNode(table.name, table)
    });

  }

  redrawGraph(){
    const {renderer, linkedOnly, extendedOptions, autoConnectNodes, settings, layoutSettings, connectFarthestNodes, eventBinding} = this.props;
    const {graphDiff} = this.state;

    if (renderer && graphDiff && graphDiff.length>0){
      this.prepareGraph(this.graph, graphDiff, this.props.data, linkedOnly, autoConnectNodes, connectFarthestNodes);
      settings.container = this.graphContainer;

      let graphics = this.props.renderer(
        this.graph,
        settings,
        layoutSettings,
        ngraph,
        eventBinding,
        extendedOptions
        // doubleClickHandler
      )
      // console.log(graphics);
      graphics.run()
      setTimeout(()=>{
        this.setState({
          graphDiff:[]
        })
      })
    }
  }

  componentWillReceiveProps(nextProps){
  // componentWillUpdate(nextProps){
    const graphDiff = diff(this.props.data, nextProps.data)
    this.setState({
      graphDiff
    })
  }

  connectFarthestNodesOfGraph(graph) {
    let adjList = {};

    graph.forEachNode((node) => {
      if (!adjList[node.id]) {
        adjList[node.id] = [];
      }

      node.links.forEach((link) => {
        if (link.toId === node.id) {
          adjList[node.id].push(link.fromId);
        } else {
          adjList[node.id].push(link.toId);
        }
      });
    });

    let graphDiameter = getGraphDiameter(adjList);

    if (!graph.hasLink(graphDiameter.nodeA, graphDiameter.nodeB) &&
        !graph.hasLink(graphDiameter.nodeB, graphDiameter.nodeA)) {
          graph.addLink(
            graphDiameter.nodeA,
            graphDiameter.nodeB,
            [graphDiameter.nodeA,{TableName:graphDiameter.nodeB}]
          );
        }
  }

  shouldComponentUpdate(nextProps){
    const graphDiff = diff(this.props.data, nextProps.data)
    return (graphDiff && graphDiff.length>0) ? true:false
  }

  render(){
    const {className, extendedOptions, data} = this.props

    this.redrawGraph()
    return(
      <div
        className={className}
        ref={(element)=>{this.graphContainer = element;}}
      />
    )
  }
}

export default Graph;
