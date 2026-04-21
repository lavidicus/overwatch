#!/usr/bin/env python3
"""ComfyUI API client for text-to-video/image generation using LTX-2.3."""

import argparse
import json
import sys
import time
import urllib.request
import urllib.error
import uuid
import os

COMFYUI_URL = os.environ.get("COMFYUI_URL", "http://llama:8188")

# LTX-2.3 text-to-video workflow template
LTX_VIDEO_WORKFLOW = {
    "1": {
        "class_type": "UnetLoaderGGUF",
        "inputs": {"unet_name": "ltx-2.3-22b-dev-Q4_K_M.gguf"}
    },
    "2": {
        "class_type": "CLIPLoaderGGUF",
        "inputs": {
            "clip_name": "gemma-3-12b-it-qat-UD-Q4_K_XL.gguf",
            "type": "ltxv"
        }
    },
    "3": {
        "class_type": "LTXVAudioVAELoader",
        "inputs": {
            "audio_vae_name": "ltx-2.3-22b-dev_audio_vae.safetensors",
            "video_vae_name": "ltx-2.3-22b-dev_video_vae.safetensors"
        }
    },
    "4": {
        "class_type": "CLIPTextEncode",
        "inputs": {
            "text": "PLACEHOLDER_PROMPT",
            "clip": ["2", 0]
        }
    },
    "5": {
        "class_type": "CLIPTextEncode",
        "inputs": {
            "text": "PLACEHOLDER_NEGATIVE",
            "clip": ["2", 0]
        }
    },
    "6": {
        "class_type": "EmptyLTXVLatentVideo",
        "inputs": {
            "width": 768,
            "height": 512,
            "length": 97,
            "batch_size": 1
        }
    },
    "7": {
        "class_type": "LTXVScheduler",
        "inputs": {
            "steps": 20,
            "max_shift": 2.36,
            "base_shift": 0.95,
            "stretch": True,
            "terminal": 0.1,
            "model": ["1", 0],
            "latent_image": ["6", 0]
        }
    },
    "8": {
        "class_type": "LTXVConditioning",
        "inputs": {
            "positive": ["4", 0],
            "negative": ["5", 0],
            "frame_rate": 24
        }
    },
    "9": {
        "class_type": "SamplerCustom",
        "inputs": {
            "add_noise": True,
            "noise_seed": 42,
            "cfg": 3.5,
            "model": ["1", 0],
            "positive": ["8", 0],
            "negative": ["8", 1],
            "sampler": ["10", 0],
            "sigmas": ["7", 0],
            "latent_image": ["6", 0]
        }
    },
    "10": {
        "class_type": "KSamplerSelect",
        "inputs": {"sampler_name": "euler"}
    },
    "11": {
        "class_type": "VAEDecode",
        "inputs": {
            "samples": ["9", 0],
            "vae": ["3", 0]
        }
    },
    "12": {
        "class_type": "SaveAnimatedWEBP",
        "inputs": {
            "filename_prefix": "ltx_output",
            "fps": 24,
            "lossless": False,
            "quality": 85,
            "method": "default",
            "images": ["11", 0]
        }
    }
}


def api_request(endpoint, data=None, method="GET"):
    """Make a request to ComfyUI API."""
    url = f"{COMFYUI_URL}{endpoint}"
    if data:
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode(),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
    else:
        req = urllib.request.Request(url, method=method)
    try:
        with urllib.request.urlopen(req, timeout=600) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.URLError as e:
        print(f"Error connecting to {url}: {e}", file=sys.stderr)
        sys.exit(1)


def queue_prompt(workflow):
    """Queue a workflow for execution."""
    client_id = str(uuid.uuid4())
    payload = {"prompt": workflow, "client_id": client_id}
    result = api_request("/prompt", data=payload)
    return result.get("prompt_id"), client_id


def wait_for_completion(prompt_id, timeout=600):
    """Poll until prompt completes."""
    start = time.time()
    while time.time() - start < timeout:
        history = api_request(f"/history/{prompt_id}")
        if prompt_id in history:
            return history[prompt_id]
        time.sleep(2)
        print(".", end="", flush=True)
    print("\nTimeout waiting for generation.", file=sys.stderr)
    sys.exit(1)


def download_output(history, output_path):
    """Download the first output file from completed history."""
    outputs = history.get("outputs", {})
    for node_id, node_out in outputs.items():
        for key in ("images", "gifs", "videos"):
            if key in node_out:
                for item in node_out[key]:
                    fname = item.get("filename", "")
                    subfolder = item.get("subfolder", "")
                    url = f"{COMFYUI_URL}/view?filename={fname}&subfolder={subfolder}"
                    print(f"Downloading: {fname}")
                    urllib.request.urlretrieve(url, output_path)
                    print(f"Saved to: {output_path}")
                    return output_path
    print("No output files found in history.", file=sys.stderr)
    return None


def main():
    parser = argparse.ArgumentParser(description="Generate video/image via ComfyUI LTX-2.3")
    parser.add_argument("--prompt", "-p", required=True, help="Text prompt")
    parser.add_argument("--negative", "-n", default="", help="Negative prompt")
    parser.add_argument("--mode", choices=["video", "image"], default="video")
    parser.add_argument("--output", "-o", default="/tmp/comfyui_output.webp")
    parser.add_argument("--width", type=int, default=768)
    parser.add_argument("--height", type=int, default=512)
    parser.add_argument("--frames", type=int, default=97, help="Video frames (97=~4s at 24fps)")
    parser.add_argument("--steps", type=int, default=20)
    parser.add_argument("--seed", type=int, default=-1, help="Random seed (-1 for random)")
    parser.add_argument("--cfg", type=float, default=3.5)
    parser.add_argument("--timeout", type=int, default=600)
    parser.add_argument("--url", default=None, help="ComfyUI URL override")
    args = parser.parse_args()

    global COMFYUI_URL
    if args.url:
        COMFYUI_URL = args.url

    # Check server
    try:
        stats = api_request("/system_stats")
        print(f"ComfyUI connected. Devices: {len(stats.get('devices', []))}")
    except SystemExit:
        print("Cannot connect to ComfyUI. Is sd-server running on llama?", file=sys.stderr)
        sys.exit(1)

    # Build workflow
    workflow = json.loads(json.dumps(LTX_VIDEO_WORKFLOW))
    workflow["4"]["inputs"]["text"] = args.prompt
    workflow["5"]["inputs"]["text"] = args.negative
    workflow["6"]["inputs"]["width"] = args.width
    workflow["6"]["inputs"]["height"] = args.height
    workflow["6"]["inputs"]["length"] = args.frames if args.mode == "video" else 1
    workflow["7"]["inputs"]["steps"] = args.steps
    workflow["9"]["inputs"]["cfg"] = args.cfg
    workflow["9"]["inputs"]["noise_seed"] = args.seed if args.seed >= 0 else int(time.time()) % 2**32

    print(f"Generating {args.mode}: \"{args.prompt}\"")
    print(f"Resolution: {args.width}x{args.height}, frames: {workflow['6']['inputs']['length']}, steps: {args.steps}")

    prompt_id, _ = queue_prompt(workflow)
    print(f"Queued: {prompt_id}")
    print("Waiting for generation", end="")

    history = wait_for_completion(prompt_id, timeout=args.timeout)
    print()

    if history.get("status", {}).get("status_str") == "error":
        print(f"Generation failed: {history.get('status', {}).get('messages', 'unknown error')}", file=sys.stderr)
        sys.exit(1)

    result = download_output(history, args.output)
    if result:
        print(f"Done! Output: {result}")
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
