// Original curriculum summaries. References use PDF page numbers, not printed slide numbers.
// Source slide decks remain outside this public repository.
export const courses = [
  {
    id: 'ads',
    name: 'Algorithms & Data Structures 2',
    label: 'FOUNDATION EXPEDITION',
    icon: '▧',
    color: '#b8ed80',
    description:
      'Build the tools: analyze costs, divide problems, organize data, and reason about randomness.',
    source: 'ADS Combined Slides · 737 PDF pages',
    chapters: [
      {
        name: 'Analysis & recursion',
        world: 'The Crafting Bench',
        pages: 'ADS pp. 9–125, 163–191',
        summary:
          'Count primitive operations; distinguish O, Ω and Θ; trace recursive calls; solve recurrences with expansion, recursion trees and the Master theorem.',
        mission: 'Compare input sizes and predict how much more work an algorithm needs.',
        lessons: [],
        next: 'Growth-rate sandbox, call-stack traces and recurrence exercises',
      },
      {
        name: 'Sorting & divide-and-conquer',
        world: 'Sorting Plains',
        pages: 'ADS pp. 13–35, 126–162, 192–291',
        summary:
          'Insertion sort, merge sort, quicksort, heapsort, comparison lower bounds, counting sort and radix sort.',
        mission: 'Follow the split, explain the invariant, then compare best and worst cases.',
        lessons: ['insertion', 'merge', 'quick'],
        next: 'Heapsort, counting sort, radix sort and comparison lower-bound exercises',
      },
      {
        name: 'Linked structures & ADTs',
        world: 'Redstone Railway · Storage Stronghold',
        pages: 'ADS pp. 292–439',
        summary:
          'Linked lists, abstract data types, stacks, queues and deques; compare array and linked implementations.',
        mission: 'Trace pointers and explain why stack and queue removal orders differ.',
        lessons: ['traverse', 'stack', 'queue'],
        next: 'List insertion/deletion, circular buffers, resizable arrays and deques',
      },
      {
        name: 'Trees & search',
        world: 'Binary Forest',
        pages: 'ADS pp. 440–541',
        summary:
          'Tree representations, height, traversal, binary search trees and operations on search trees.',
        mission: 'Follow branches and distinguish tree height from the number of nodes.',
        lessons: ['bst', 'inorder'],
        next: 'BST insertion/deletion and additional traversals',
      },
      {
        name: 'Balanced search trees',
        world: 'The Canopy Citadel',
        pages: 'ADS pp. 542–636',
        summary: 'Red-black trees, rotations, AVL comparisons and B-trees with multi-key nodes.',
        mission: 'Restore a structural invariant after inserting a key.',
        lessons: [],
        next: 'Rotation workshop, red-black insertion and B-tree splitting',
      },
      {
        name: 'Maps & hashing',
        world: 'Chest Archives',
        pages: 'ADS pp. 637–706',
        summary:
          'Map ADT, hash functions, chaining, load factor and open addressing with linear, quadratic and double-hash probing.',
        mission: 'Resolve collisions and explain why expected constant time needs assumptions.',
        lessons: ['hash'],
        next: 'Chaining, deletion tombstones and alternative probe strategies',
      },
      {
        name: 'Probability in computing',
        world: 'The Enchantment Table',
        pages: 'ADS pp. 707–737',
        summary:
          'Birthday paradox, coupon collector, balls into bins, randomized quicksort and randomized hashing.',
        mission: 'Run repeated trials and compare observations with expected values.',
        lessons: [],
        next: 'Probability experiments and expected-cost exercises',
      },
    ],
  },
  {
    id: 'algo',
    name: 'Algorithmics I',
    label: 'DEEPER MINES',
    icon: '◇',
    color: '#8ddcd1',
    description: 'Go beyond the basics: process text, connect worlds, and explore the limits of computation.',
    source: 'Algorithmics I · Merged Slides 1 & 2 · 2,247 PDF pages',
    chapters: [
      {
        name: 'Sorting, heaps & tries',
        world: 'Diamond Peak · Wordwood',
        pages: 'Deck 1 pp. 34–170',
        summary: 'Comparison sorting recap, radix sorting, trie search/insertion and heap construction.',
        mission: 'Contrast digit-by-digit sorting with comparison sorting; follow a word through a trie.',
        lessons: ['heap'],
        next: 'Radix sorting and trie search/insertion',
      },
      {
        name: 'Text compression',
        world: 'The Compression Forge',
        pages: 'Deck 1 pp. 171–269',
        summary:
          'Huffman prefix codes and LZW dictionary-based compression/decompression, including the special decoding case.',
        mission: 'Build a coding tree or dictionary and decode your own message.',
        lessons: [],
        next: 'Huffman tree building, bit-cost comparison and LZW dictionary traces',
      },
      {
        name: 'String distance & pattern search',
        world: 'The Rune Library',
        pages: 'Deck 1 pp. 270–559; Deck 2 pp. 15–193',
        summary:
          'Edit distance with dynamic programming and traceback; brute-force matching, KMP border tables and Boyer–Moore shifts.',
        mission: 'Fill a distance table or predict which characters are compared after a mismatch.',
        lessons: [],
        next: 'Edit-distance grid, KMP border builder and pattern-search visualizers',
      },
      {
        name: 'Graphs & routes',
        world: 'Pathfinder Valley',
        pages: 'Deck 1 pp. 913–1511; Deck 2 pp. 194–246',
        summary:
          'Graph representations, BFS, DFS, shortest paths with Dijkstra, minimum spanning trees with Prim–Jarnik and its Dijkstra refinement, and topological ordering.',
        mission: 'Separate shortest paths from cheapest spanning networks; track the frontier at every step.',
        lessons: ['bfs', 'dfs'],
        next: 'Editable graphs, Dijkstra shortest paths, MST lessons and topological ordering',
      },
      {
        name: 'P, NP & reductions',
        world: 'The End Portal',
        pages: 'Deck 1 pp. 1515–1636, 1952–1998',
        summary:
          'Decision problems, polynomial-time verification, NP-completeness and polynomial reductions.',
        mission: 'Choose the correct direction of a reduction and justify both implications.',
        lessons: [],
        next: 'Verification challenges and reduction proof exercises',
      },
      {
        name: 'Computability & automata',
        world: 'Redstone Machines',
        pages: 'Deck 1 pp. 1646–1951; Deck 2 pp. 1–12',
        summary:
          'Halting and undecidability, finite automata and regular expressions, pushdown automata, Turing machines and the Church–Turing thesis.',
        mission: 'Trace a machine on an input, then explain what language it recognizes.',
        lessons: [],
        next: 'DFA transitions, PDA stacks, Turing tapes and undecidability exercises',
      },
    ],
  },
];
