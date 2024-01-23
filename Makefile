mesh:
	node generate-mesh.mjs example-lowres-input.tif temp-output.txt
example:
	node index.mjs example-input.tif example-output.png
clean:
	rm temp-output.png
