// @flow strict-local

import assert from 'assert';
import sinon from 'sinon';

import Graph from '../src/Graph';
import {toNodeId} from '../src/types';

describe.only('Graph', () => {
  it.only('constructor should initialize an empty graph', () => {
    let graph = new Graph();
    assert.deepEqual(graph.nodes, new Map());
    assert.deepEqual(graph.getAllEdges(), []);
  });

  it.only('addNode should add a node to the graph', () => {
    let graph = new Graph();
    let node = {id: 'do not use', type: 'mynode', value: 'a'};
    let id = graph.addNode(node);
    assert.equal(graph.nodes.get(id), node);
  });

  it("errors when removeNode is called with a node that doesn't belong", () => {
    let graph = new Graph();
    assert.throws(() => {
      graph.removeNode(toNodeId(-1));
    }, /Does not have node/);
  });

  it('errors when traversing a graph with no root', () => {
    let graph = new Graph();

    assert.throws(() => {
      graph.traverse(() => {});
    }, /A start node is required to traverse/);
  });

  it("errors when traversing a graph with a startNode that doesn't belong", () => {
    let graph = new Graph();

    assert.throws(() => {
      graph.traverse(() => {}, toNodeId(-1));
    }, /Does not have node/);
  });

  it("errors if replaceNodeIdsConnectedTo is called with a node that doesn't belong", () => {
    let graph = new Graph();
    assert.throws(() => {
      graph.replaceNodeIdsConnectedTo(toNodeId(-1), []);
    }, /Does not have node/);
  });

  it.only("errors when adding an edge to a node that doesn't exist", () => {
    let graph = new Graph();
    let node = graph.addNode({id: 'foo', type: 'mynode', value: null});
    assert.throws(() => {
      graph.addEdge(node, toNodeId(-1));
    }, /"to" node '-1' not found/);
  });

  it.only("errors when adding an edge from a node that doesn't exist", () => {
    let graph = new Graph();
    let node = graph.addNode({id: 'foo', type: 'mynode', value: null});
    assert.throws(() => {
      graph.addEdge(toNodeId(-1), node);
    }, /"from" node '-1' not found/);
  });

  it('hasNode should return a boolean based on whether the node exists in the graph', () => {
    let graph = new Graph();
    let node = graph.addNode({id: 'a', type: 'mynode', value: 'a'});
    assert(graph.hasNode(node));
    assert(!graph.hasNode(toNodeId(-1)));
  });

  it.only('addEdge should add an edge to the graph', () => {
    let graph = new Graph();
    let nodeA = graph.addNode({id: 'a', type: 'mynode', value: null});
    let nodeB = graph.addNode({id: 'b', type: 'mynode', value: null});
    graph.addEdge(nodeA, nodeB);
    assert(graph.hasEdge(nodeA, nodeB));
  });

  it('isOrphanedNode should return true or false if the node is orphaned or not', () => {
    let graph = new Graph();
    let nodeA = graph.addNode({id: 'a', type: 'mynode', value: 'a'});
    let nodeB = graph.addNode({id: 'b', type: 'mynode', value: 'b'});
    let nodeC = graph.addNode({id: 'c', type: 'mynode', value: 'c'});
    graph.addEdge(nodeA, nodeB);
    graph.addEdge(nodeA, nodeC, 1);
    assert(graph.isOrphanedNode(nodeA));
    assert(!graph.isOrphanedNode(nodeB));
    assert(!graph.isOrphanedNode(nodeC));
  });

  it('removeEdge should prune the graph at that edge', () => {
    //         a
    //        / \
    //       b - d
    //      /
    //     c
    let graph = new Graph();
    let nodeA = graph.addNode({id: 'a', type: 'mynode', value: 'a'});
    let nodeB = graph.addNode({id: 'b', type: 'mynode', value: 'b'});
    let nodeC = graph.addNode({id: 'c', type: 'mynode', value: 'c'});
    let nodeD = graph.addNode({id: 'd', type: 'mynode', value: 'd'});
    graph.addEdge(nodeA, nodeB);
    graph.addEdge(nodeA, nodeD);
    graph.addEdge(nodeB, nodeC);
    graph.addEdge(nodeB, nodeD);

    graph.removeEdge(nodeA, nodeB);
    assert(graph.nodes.has(nodeA));
    assert(graph.nodes.has(nodeD));
    assert(!graph.nodes.has(nodeB));
    assert(!graph.nodes.has(nodeC));
    assert.deepEqual(graph.getAllEdges(), [{from: nodeA, to: nodeD, type: 0}]);
  });

  it('removing a node recursively deletes orphaned nodes', () => {
    // before:
    //       a
    //      / \
    //     b   c
    //    / \    \
    //   d   e    f
    //  /
    // g
    //

    // after:
    //      a
    //       \
    //        c
    //         \
    //          f

    let graph = new Graph();
    let nodeA = graph.addNode({id: 'a', type: 'mynode', value: 'a'});
    let nodeB = graph.addNode({id: 'b', type: 'mynode', value: 'b'});
    let nodeC = graph.addNode({id: 'c', type: 'mynode', value: 'c'});
    let nodeD = graph.addNode({id: 'd', type: 'mynode', value: 'd'});
    let nodeE = graph.addNode({id: 'e', type: 'mynode', value: 'e'});
    let nodeF = graph.addNode({id: 'f', type: 'mynode', value: 'f'});
    let nodeG = graph.addNode({id: 'g', type: 'mynode', value: 'g'});

    graph.addEdge(nodeA, nodeB);
    graph.addEdge(nodeA, nodeC);
    graph.addEdge(nodeB, nodeD);
    graph.addEdge(nodeB, nodeE);
    graph.addEdge(nodeC, nodeF);
    graph.addEdge(nodeD, nodeG);

    graph.removeNode(nodeB);

    assert.deepEqual([...graph.nodes.keys()], [nodeA, nodeC, nodeF]);
    assert.deepEqual(graph.getAllEdges(), [
      {from: nodeA, to: nodeC, type: 0},
      {from: nodeC, to: nodeF, type: 0},
    ]);
  });

  it('removing a node recursively deletes orphaned nodes if there is no path to the root', () => {
    // before:
    //       a
    //      / \
    //     b   c
    //    / \    \
    // |-d   e    f
    // |/
    // g
    //

    // after:
    //      a
    //       \
    //        c
    //         \
    //          f

    let graph = new Graph();
    let nodeA = graph.addNode({id: 'a', type: 'mynode', value: 'a'});
    let nodeB = graph.addNode({id: 'b', type: 'mynode', value: 'b'});
    let nodeC = graph.addNode({id: 'c', type: 'mynode', value: 'c'});
    let nodeD = graph.addNode({id: 'd', type: 'mynode', value: 'd'});
    let nodeE = graph.addNode({id: 'e', type: 'mynode', value: 'e'});
    let nodeF = graph.addNode({id: 'f', type: 'mynode', value: 'f'});
    let nodeG = graph.addNode({id: 'g', type: 'mynode', value: 'g'});
    graph.setRootNodeId(nodeA);

    graph.addEdge(nodeA, nodeB);
    graph.addEdge(nodeA, nodeC);
    graph.addEdge(nodeB, nodeD);
    graph.addEdge(nodeG, nodeD);
    graph.addEdge(nodeB, nodeE);
    graph.addEdge(nodeC, nodeF);
    graph.addEdge(nodeD, nodeG);

    graph.removeNode(nodeB);

    assert.deepEqual([...graph.nodes.keys()], [nodeA, nodeC, nodeF]);
    assert.deepEqual(graph.getAllEdges(), [
      {from: nodeA, to: nodeC, type: 0},
      {from: nodeC, to: nodeF, type: 0},
    ]);
  });

  it('removing an edge to a node that cycles does not remove it if there is a path to the root', () => {
    //        a
    //        |
    //        b <----
    //       / \    |
    //      c   d   |
    //       \ /    |
    //        e -----
    let graph = new Graph();
    let nodeA = graph.addNode({id: 'a', type: 'mynode', value: 'a'});
    let nodeB = graph.addNode({id: 'b', type: 'mynode', value: 'b'});
    let nodeC = graph.addNode({id: 'c', type: 'mynode', value: 'c'});
    let nodeD = graph.addNode({id: 'd', type: 'mynode', value: 'd'});
    let nodeE = graph.addNode({id: 'e', type: 'mynode', value: 'e'});
    graph.setRootNodeId(nodeA);

    graph.addEdge(nodeA, nodeB);
    graph.addEdge(nodeB, nodeC);
    graph.addEdge(nodeB, nodeD);
    graph.addEdge(nodeC, nodeE);
    graph.addEdge(nodeD, nodeE);
    graph.addEdge(nodeE, nodeB);

    const getNodeIds = () => [...graph.nodes.keys()];
    let nodesBefore = getNodeIds();

    graph.removeEdge(nodeC, nodeE);

    assert.deepEqual(nodesBefore, getNodeIds());
    assert.deepEqual(graph.getAllEdges(), [
      {from: nodeA, to: nodeB, type: 0},
      {from: nodeB, to: nodeC, type: 0},
      {from: nodeB, to: nodeD, type: 0},
      {from: nodeD, to: nodeE, type: 0},
      {from: nodeE, to: nodeB, type: 0},
    ]);
  });

  it('removing a node with only one inbound edge does not cause it to be removed as an orphan', () => {
    let graph = new Graph();

    let nodeA = graph.addNode({id: 'a', type: 'mynode', value: 'a'});
    let nodeB = graph.addNode({id: 'b', type: 'mynode', value: 'b'});
    graph.setRootNodeId(nodeA);

    graph.addEdge(nodeA, nodeB);

    let spy = sinon.spy(graph, 'removeNode');
    try {
      graph.removeNode(nodeB);

      assert(spy.calledOnceWithExactly(nodeB));
    } finally {
      spy.restore();
    }
  });

  it("replaceNodeIdsConnectedTo should update a node's downstream nodes", () => {
    let graph = new Graph();
    let nodeA = graph.addNode({id: 'a', type: 'mynode', value: 'a'});
    let nodeB = graph.addNode({id: 'b', type: 'mynode', value: 'b'});
    let nodeC = graph.addNode({id: 'c', type: 'mynode', value: 'c'});
    graph.addEdge(nodeA, nodeB);
    graph.addEdge(nodeA, nodeC);

    let nodeD = graph.addNode({id: 'd', type: 'mynode', value: 'd'});
    graph.replaceNodeIdsConnectedTo(nodeA, [nodeB, nodeD]);

    assert(graph.hasNode(nodeA));
    assert(graph.hasNode(nodeB));
    assert(!graph.hasNode(nodeC));
    assert(graph.hasNode(nodeD));
    assert.deepEqual(graph.getAllEdges(), [
      {from: nodeA, to: nodeB, type: 0},
      {from: nodeA, to: nodeD, type: 0},
    ]);
  });

  it('traverses along edge types if a filter is given', () => {
    let graph = new Graph();
    let nodeA = graph.addNode({id: 'a', type: 'mynode', value: 'a'});
    let nodeB = graph.addNode({id: 'b', type: 'mynode', value: 'b'});
    let nodeC = graph.addNode({id: 'c', type: 'mynode', value: 'c'});
    let nodeD = graph.addNode({id: 'd', type: 'mynode', value: 'd'});

    graph.addEdge(nodeA, nodeB, 1);
    graph.addEdge(nodeA, nodeD);
    graph.addEdge(nodeB, nodeC);
    graph.addEdge(nodeB, nodeD, 1);

    graph.setRootNodeId(nodeA);

    let visited = [];
    graph.traverse(
      nodeId => {
        visited.push(nodeId);
      },
      null, // use root as startNode
      1,
    );

    assert.deepEqual(visited, [nodeA, nodeB, nodeD]);
  });
});
