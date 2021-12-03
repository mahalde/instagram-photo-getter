const Instagram = require("instagram-web-api");
const Downloader = require("nodejs-file-downloader");

const client = new Instagram({
  username: "username",
  password: "password",
});
const username = "username";

async function main() {
  await client.login();
  const { user } = await client
    .getPhotosByUsername({ username })
    .catch(console.error);
  let photoObj = user.edge_owner_to_timeline_media;
  
  let photoUrls = await getPictures(photoObj);
  console.log('worked');

  while (photoObj.page_info.has_next_page) {
    photoObj = (
      await client.getPhotosByUsername({
        username,
        after: photoObj.page_info.end_cursor,
      })
    ).user.edge_owner_to_timeline_media;

    photoUrls = [...photoUrls, ...(await getPictures(photoObj))];
    console.log('worked');
  }

  console.log(photoUrls);
  for (const url of photoUrls) {
    try {
      const downloader = new Downloader({
        url,
        directory: './instagram'
      });
      await downloader.download();
    } catch (err) {
      console.error(err);
      break;
    }
  }
}

async function getPictures(photoObj) {
  const edges = photoObj.edges;
  const photoUrls = [];
  console.log(edges.length);

  for (const {node} of edges) {
    const children = node.edge_sidecar_to_children;

    if (!children) {
      if (node.is_video) {
        photoUrls.push(node.video_url)
      }
      photoUrls.push(node.display_url)
      continue;
    }
    const childEdges = children.edges;

    for (const {node: childNode} of childEdges) {
      if (childNode.is_video) {
        photoUrls.push(childNode.video_url);
      }
      photoUrls.push(childNode.display_url);
    }
  }

  return photoUrls;
}

main();
