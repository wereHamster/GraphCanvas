<?php

header("Content-Type: text/plain");

$graph = array('nodes' => array());

$contents = file("data.txt");
$idMatch = '([a-zA-Z\u0080-\uFFFF_][0-9a-zA-Z\u0080-\uFFFF_]*|-?(?:\\.\\d+|\\d+(?:\\.\\d*)?)|"(?:\\\\"|[^"])*"|<(?:<[^>]*>|[^<>]+?)+>)';

function parseAttrs($attrs) {
	$ret = array();

	if (preg_match_all('/(\w+)=("[^"]+"|\w+)/', $attrs, $matches)) {
		foreach ($matches[1] as $key => $val) {
			if ($val == 'pos' || $val == 'lp') {
				if (preg_match_all('/(\d+\.?\d*),(\d+\.?\d*)/', $matches[2][$key], $match)) {
					if (count($match[0]) == 1) {
						$ret[$val] = array(floatval($match[1][0]), floatval($match[2][0]));
					} else {
						foreach ($match[1] as $i => $x) {
							$ret[$val][] = array(floatval($x), floatval($match[2][$i]));
						}
					}
				} else {
					die('Can not parse position: '.$matches[2][$key]);
				}
			} else {
				$ret[$val] = trim($matches[2][$key], "\x22\x27");
			}
		}
	} else {
		die('Can not parse attributes: '.$attrs);
	}
		
	return $ret;
}

foreach ($contents as $line) {
	if (preg_match("/^digraph \{$/", $line, $matches)) {
	} else if (preg_match("/^\s+graph \[(.*)\];$/", $line, $matches)) {
		$attrs = parseAttrs($matches[1]);
		if (isset($attrs['bb'])) {
			if (preg_match("/\d+,\d+,(\d+\.?\d*),(\d+\.?\d*)/", $attrs['bb'], $match)) {
				$graph['size'] = array(floatval($match[1]), floatval($match[2]));
			} else {
				die('Could not parse graph size: '.$attrs['bb']);
			}
		}
	} else if (preg_match("/^\s+node \[(.*)\];$/", $line, $matches)) {
	} else if (preg_match("/^\s+edge \[(.*)\];$/", $line, $matches)) {
	} else if (preg_match("/^\s+\"([^\"]*)\" \[(.*)\];$/", $line, $matches)) {
		$graph['nodes'][$matches[1]] = parseAttrs($matches[2]);
		$graph['nodes'][$matches[1]]['edges'] = array();
	} else if (preg_match("/^\s+\"([^\"]*)\" -> \"([^\"]*)\" \[(.+)\];$/", $line, $matches)) {
		$graph['nodes'][$matches[1]]['edges'][$matches[2]] = parseAttrs($matches[3]);
	} else if (preg_match("/^\}$/", $line, $matches)) {
	} else {
		die('Can not parse line: '.$line);
	}
}

function json_format($json)
{
    $tab = "  ";
    $new_json = "";
    $indent_level = 0;
    $in_string = false;

    $json_obj = json_decode($json);

    if($json_obj === false)
        return false;

    $json = json_encode($json_obj);
    $len = strlen($json);

    for($c = 0; $c < $len; $c++)
    {
        $char = $json[$c];
        switch($char)
        {
            case '{':
            case '[':
                if(!$in_string)
                {
                    $new_json .= $char . "\n" . str_repeat($tab, $indent_level+1);
                    $indent_level++;
                }
                else
                {
                    $new_json .= $char;
                }
                break;
            case '}':
            case ']':
                if(!$in_string)
                {
                    $indent_level--;
                    $new_json .= "\n" . str_repeat($tab, $indent_level) . $char;
                }
                else
                {
                    $new_json .= $char;
                }
                break;
            case ',':
                if(!$in_string)
                {
                    $new_json .= ",\n" . str_repeat($tab, $indent_level);
                }
                else
                {
                    $new_json .= $char;
                }
                break;
            case ':':
                if(!$in_string)
                {
                    $new_json .= ": ";
                }
                else
                {
                    $new_json .= $char;
                }
                break;
            case '"':
                if($c > 0 && $json[$c-1] != '\\')
                {
                    $in_string = !$in_string;
                }
            default:
                $new_json .= $char;
                break;                    
        }
    }

    return $new_json;
}

$newgraph = array();
$newgraph['size'] = $graph['size'];
$newgraph['nodes'] = array();
$newgraph['nodes']['git:parse_commit_buffer'] = $graph['nodes']['git:parse_commit_buffer'];
$newgraph['nodes']['git:commit_list_insert'] = $graph['nodes']['git:commit_list_insert'];

$graph['fibers'] = array();
$graph['fibers'][] = array('git:handle_internal_command', 'git:cmd_pack_objects', 'git:traverse_commit_list', 'git:process_tree', 'git:parse_tree');
$graph['fibers'][] = array('git:handle_internal_command', 'git:cmd_pack_objects', 'git:traverse_commit_list', 'git:get_revision', 'git:get_revision_internal');

print json_format(json_encode($graph));

?>