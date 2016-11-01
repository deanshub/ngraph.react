import React, { Component } from 'react'
import ngraph from 'ngraph.graph'
import { diff } from 'deep-diff'
import { KINDS } from './constants'

class Graph extends Component {
  static defaultProps = {
    renderer: null,
    layout: null,
    data: {
      relations: [],
      tables: [],
    },
    linkedOnly: false,
    maxSteps: 100,
  }

  constructor(props){
    super(props)
    this.graph = ngraph()
    this.state = {
      graph: this.graph,
      graphDiff:[],
    }
  }

  prepareGraph(graph, graphDiff=[], graphData, linkedOnly){
    let nodesToBeAdded = [];
    let dimentionId=1;

    graphDiff.forEach(diff=>{
      if (diff.path[0]==='tables'||diff.path[0]==='relations'){
        if (diff.item.kind===KINDS.NEW){
          if (diff.path[0]==='tables'){
            const table = diff.item.rhs
            if (!linkedOnly){
              graph.addNode(table.name, table);
            }
          }else if (diff.path[0]==='relations'){
            const relation = Object.assign({},diff.item.rhs, {type:'dimention'})
            graph.addNode('dimention' + dimentionId, relation);

            for (var index = 0; index < relation.connections.length; index++) {
              if (linkedOnly){
                const node = graph.getNode(relation.connections[index].TableName)
                if (node===undefined){
                  nodesToBeAdded.push(relation.connections[index].TableName)
                }
              }
              graph.addLink(
                relation.connections[index].TableName,
                'dimention' + dimentionId,
                [relation.connections[index],{TableName:'dimention' + dimentionId}]
              );
            }
            dimentionId++;
          }
        } else if (diff.item.kind===KINDS.DELETE){
          console.log('delete');
        }
      }
    })

    graphDiff
    .filter(diff=>{
      return diff.path[0]==='tables' && nodesToBeAdded.includes(diff.item.rhs.name)
    })
    .forEach(diff=>{
      const table = diff.item.rhs
      graph.addNode(table.name, table)
    })
  }

  redrawGraph(){
    const {renderer, maxSteps, linkedOnly} = this.props
    const {graphDiff} = this.state

    if (renderer && graphDiff && graphDiff.length>0){
      this.prepareGraph(this.graph, graphDiff, this.props.data, linkedOnly)
      let graphics = this.props.renderer(
        this.graph,
        {
          container: this.refs.graphContainer,
          maxSteps,
        },
        ngraph,
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
    console.log(graphDiff);
    this.setState({
      graphDiff
    })
  }

  shouldComponentUpdate(nextProps){
    const graphDiff = diff(this.props.data, nextProps.data)
    console.log('diff: ', (graphDiff && graphDiff.length>0) ? true:false);
    return (graphDiff && graphDiff.length>0) ? true:false
  }

  render(){
    const {className} = this.props
    this.redrawGraph()
    return(
      <div
        className={className}
        ref="graphContainer"
      />
    )
  }
}

export default Graph;
