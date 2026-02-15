const { element } = require('../modules/shadow-tree/shadowTree');
const { state } = require('../core/state');
const { truncateFilenameKeepExtension } = require('../utils/helper');
const { GifPlayer } = require('../utils/gifPlayer');
const { Generator } = require('../utils/generate.js');

const Photo = async (imagePath) => {
  const isGif = imagePath.toLowerCase().endsWith('.gif');
  
  let normalizedWidth = state.terminal.width;
  let normalizedHeight = state.terminal.height;
  
  if (isGif) {
    try {
      const generator = new Generator();
      const dimensions = await generator.getImageDimensions(imagePath);
      const imageAspectRatio = dimensions.width / dimensions.height;
      
      if (imageAspectRatio > 1) {
        normalizedWidth = state.terminal.width;
        normalizedHeight = Math.round(state.terminal.width / imageAspectRatio);
      } else {
        normalizedHeight = state.terminal.height;
        normalizedWidth = Math.round((state.terminal.height) * imageAspectRatio);
      }
    } catch (error) {
      console.warn(`Could not get GIF dimensions for ${imagePath}:`, error.message);
    }
    
    if (!state.gifPlayers) {
      state.gifPlayers = new Map();
    }
    
    for (const [key, player] of state.gifPlayers.entries()) {
      if (key !== imagePath) {
        player.pause();
        player.currentFrame = 0;
      }
    }
    
    const gifKey = imagePath;
    let gifPlayer = state.gifPlayers.get(gifKey);
    
    const needsReload = gifPlayer && gifPlayer.needsReload(
      state.terminal.width, 
      state.terminal.height, 
      normalizedWidth, 
      normalizedHeight
    );
    
    if (needsReload) {
      gifPlayer.killFrameConversion();
      
      gifPlayer.clearSizeCache(gifPlayer.normalizedWidth, gifPlayer.normalizedHeight);
      
      gifPlayer.width = state.terminal.width;
      gifPlayer.height = state.terminal.height;
      gifPlayer.normalizedWidth = normalizedWidth;
      gifPlayer.normalizedHeight = normalizedHeight;
      
      if (gifPlayer.isPlaying) {
        gifPlayer.resume();
      }
    }
    
    if (!gifPlayer) {
      gifPlayer = new GifPlayer();
      state.gifPlayers.set(gifKey, gifPlayer);
      
      gifPlayer.isLoading = true;
      
      gifPlayer.loadGif(imagePath, state.terminal.width, state.terminal.height, normalizedWidth, normalizedHeight).then(() => {
        gifPlayer.isLoading = false;
        gifPlayer.play((frameData) => {
          if (state.photoPath === imagePath) {
            state.needsRerender = true;
          }
        });
      }).catch(error => {
        gifPlayer.isLoading = false;
      });
    } else if (!gifPlayer.isPlaying && gifPlayer.frameCache.size > 0) {
      gifPlayer.resume();
    } else if (!gifPlayer.isPlaying && gifPlayer.frameCache.size === 0) {
      gifPlayer.isLoading = true;
      gifPlayer.loadGif(imagePath, state.terminal.width, state.terminal.height, normalizedWidth, normalizedHeight).then(() => {
        gifPlayer.isLoading = false;
        gifPlayer.play((frameData) => {
          if (state.photoPath === imagePath) {
            state.needsRerender = true;
          }
        });
      }).catch(error => {
        gifPlayer.isLoading = false;
      });
    }
  }

  const elements = [
    element('div', {
      width: state.terminal.width,
      height: state.terminal.height,
      backgroundColor: 'transparent',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 1,
    }, [
      element('img', {
        width: state.terminal.width,
        height: state.terminal.height,
        textAlign: 'left',
        verticalAlign: 'top',
        pixelFont: true,
        backgroundColor: 'transparent',
        overflow: 'hidden',
        staticMode: false,
      }, imagePath),

      ...(state.showPhotoInfo ? [
        element('text', {
          width: state.terminal.width,
          height: 3,
          y: state.terminal.height - 3,
          textAlign: 'center',
          verticalAlign: 'middle',
          position: 'absolute',
          fontSize: 1,
          pixelFont: true,
          fontFamily: 'compact',
          backgroundColor: 'black',
          backgroundColorOpacity: 0.6,
          color: 'white',
          overflowX: 'auto',
          overflowY: 'hidden',
        }, truncateFilenameKeepExtension(imagePath.split('/').pop(), state.terminal.width - 2, 1, 'compact')),
      ] : []),
    ])
  ];

  return elements;
}

module.exports = Photo;
