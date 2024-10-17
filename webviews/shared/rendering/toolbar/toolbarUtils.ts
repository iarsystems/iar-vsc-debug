/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// Create an image entry using images from the extension.
export function addLocalImage(
    doc: Document,
    imagePath: string,
): HTMLImageElement | undefined {
    // The special vscode image directory is stored as the "imageroot" entry in
    // the html structure for the listwindow.
    const element = doc.getElementById("imageroot");
    let imageRoot = "";
    if (element !== undefined) {
        const root = element?.getAttribute("root");
        if (root !== null && root !== undefined) {
            imageRoot = root;
        }
    } else {
        console.error("Failed to load \"imageroot\"");
        return undefined;
    }

    // Found everything that we need => create the image block.
    const image = doc.createElement("img");
    image.src = `${imageRoot}/toolbar/${imagePath}`;
    return image;
}

