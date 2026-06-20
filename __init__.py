from .ltx_keyframer import LTXKeyframer
from .multi_image_loader import MultiImageLoader
from .ltx_sequencer import LTXSequencer
from .speech_length_calculator import SpeechLengthCalculator
from .load_audio_ui import LoadAudioUI
from .load_video_ui import LoadVideoUI
from .ltx_director import LTXDirector
from .ltx_auto_director import LTXAutoDirector
from .ltx_sixgrid_director import LTXGridDirector
from .ltx_director_guide import LTXDirectorGuide
from comfy_api.latest import ComfyExtension, io
from typing_extensions import override


class SFWhatDreamsCostExtension(ComfyExtension):
    @override
    async def get_node_list(self) -> list[type[io.ComfyNode]]:
        return [
            LTXDirector,
            LTXAutoDirector,
            LTXGridDirector,
            LTXDirectorGuide,
        ]


async def comfy_entrypoint() -> SFWhatDreamsCostExtension:
    return SFWhatDreamsCostExtension()


NODE_CLASS_MAPPINGS = {
    "SF-LTXKeyframer": LTXKeyframer,
    "SF-MultiImageLoader": MultiImageLoader,
    "SF-LTXSequencer": LTXSequencer,
    "SF-SpeechLengthCalculator": SpeechLengthCalculator,
    "SF-LoadAudioUI": LoadAudioUI,
    "SF-LoadVideoUI": LoadVideoUI,
    "SF-LTXDirector": LTXDirector,
    "SF-LTXAutoDirector": LTXAutoDirector,
    "SF-LTXGridDirector": LTXGridDirector,
    "SF-LTXDirectorGuide": LTXDirectorGuide,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "SF-LTXKeyframer": "SF LTX Keyframer",
    "SF-MultiImageLoader": "SF Multi Image Loader",
    "SF-LTXSequencer": "SF LTX Sequencer",
    "SF-SpeechLengthCalculator": "SF Speech Length Calculator",
    "SF-LoadAudioUI": "SF Load Audio UI",
    "SF-LoadVideoUI": "SF Load Video UI",
    "SF-LTXDirector": "SF LTX Director",
    "SF-LTXAutoDirector": "SF LTX Auto Director",
    "SF-LTXGridDirector": "SF-LTX 宫格导演台",
    "SF-LTXDirectorGuide": "SF-LTX 导演台引导",
}

WEB_DIRECTORY = "./js"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
