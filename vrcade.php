<?php

class Component_vrcade extends Component {
  public function init() {
    OrmManager::LoadModel("vrcade");
  }

  public function controller_vrcade($args) {
    $vars = array();
    return $this->GetComponentResponse("./vrcade.tpl", $vars);
  }
  public function controller_games($args) {
    $vars = array();
    $vars["games"] = array();
    $dirroot = "components/vrcade/media/games/";
    $dir = opendir($dirroot);
    while (($d = readdir($dir)) !== false) {
      if ($d[0] != '.') {
        $vars["games"][] = $d;
      }
    }
    return $this->GetComponentResponse("./games.tpl", $vars);
  }
  public function controller_models($args) {
    $vars = array();
    $vars["models"] = array();
    $dirroot = "components/vrcade/media/models/";
    $dir = opendir($dirroot);
    while (($d = readdir($dir)) !== false) {
      if ($d[0] != '.' && file_exists($dirroot . $d . '/' . $d . '.json')) {
        $vars["models"][] = $d;
      }
    }
    return $this->GetComponentResponse("./models.tpl", $vars);
  }
}  
