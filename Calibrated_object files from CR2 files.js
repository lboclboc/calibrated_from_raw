// macro: Calibrated_object files from Canon CR2 raw files

// This macro read Canon EOS raw files and convert them to 16 bit tiff. Then dark, bias, flat calibrate them and then save as 32 bit tiff
importClass(Packages.ij.IJ);
importClass(Packages.ij.io.OpenDialog);
ij = Packages.ij;

print("This macro read Canon EOS raw files and convert them to 16 bit Tiff file");
print("Then dark, bias, flat calibrate them and then save as 32 bit Tiff file");

// macro by Lars Karlsson
// to use with the software AstroImageJ for astrophoto editing
// its main use is to read raw files from DSLR cameras
// my first attempt to make a macro that read a batch of Canon CR2 files

// History:
// version 20200105 (latest)
// Lot of new options
// Set a multiplier for red and blue channel
// Set a gain when dooing HDR images
// Choise which number base in filename, 1000, 2000, 3000 ...
// 
// version 20170930
// Added option to calibrate with or without flats
// change how to add camera data in filename
//
// version 20170926
// Added option how to set output filename
// 
// version 20160515
// First release

print(" ");
print("Version 20200105");

print(" ");
print("visit my homepage to get latest version:");
print("http://astrofriend.eu/astronomy/tutorials/tutorial-astroimagej/tutorial-aij-03-my-own-macros.html");

// there is also an instruction how to use this macro
// use it by your own risk, have backup of your files!

// Note this marcro dark and bias calibrate the objectfile without and dark and bias files
// to get this to work the image must be taken with dithering technic

// Setupdata:

// ********************* sorting order of files *********************

// New parameter added, now it's possble to choose if filename order given by color or time
// Color: Red_1001, Red_1002, Red_1003 ...... Gren1_1001, Green1_1002, Green1_1003 .....
// Time: 1001_Blue, 1001_Green1, 1001_Green2, 1001_Red, 1002_Blue, 1002_Green1, 1002_Green2, 1002_Red .......
// Time is to prefer if there is a small drift because of bad polar align or a comet that moves relative stars.
// Set order="time" or order="color"

order="time";
print(" ");
print("Filename order = " + order);


// ********************* Setup default directories which you often use *********************
rawImagesDirectory = "K:/Astro processed raw and fit/../";
masterFlatDirectory = "K:/Astro calibration/Master/../";

print(" ");
print("Default raw files directory: " + rawImagesDirectory);
print("Default masterflat directory: " + masterFlatDirectory);



// ********************* flat calibration or not *********************
// Set flatcal="flat" or flatcal="noflat"

flatcal="flat";
print(" ");
print("Flat calibration = " + flatcal );

// ********************* flat calibration or not *********************
// Note: Only works with some Canon EOS yet, Canon 350D, 5D and 6D tested
// I use the overscan area and I have not find that Nikon or Sony works as Canon do
// But you can always test on your raw files

// set extension to your camera: fileype = ".cr2"; // Canon
// set extension to your camera: fileype = ".nef"; // Nikon experimental
// set extension to your camera: fileype = ".arw"; // Sony experimental

filetype = ".cr2";

// ********************* red and green channel gain correction *********************
// macro: Calibrated_object files from Canon CR2 raw files
redGain = NaN;
greenGain = NaN;
blueGain = NaN;
hdrGain = NaN;
offset = NaN;

do {
    gd = new GenericDialog("Input Data");

    gd.addNumericField("Red gain:", 1.5, 2);
    gd.addNumericField("Green gain:", 1, 2);
    gd.addNumericField("Blue gain:", 1.7, 2);
    gd.addNumericField("HDR gain:", 1.0, 2);
    gd.addNumericField("Base number, 1=1000, 2=2000, 3=3000 ... ", 1, 0);

    gd.showDialog();

    redGain = gd.getNextNumber();
    greenGain = gd.getNextNumber();
    blueGain = gd.getNextNumber();
    hdrGain = gd.getNextNumber();;
    offset = gd.getNextNumber();;

} while (gd.invalidNumber() && !gd.wasCanceled());

if (gd.wasCanceled())
    exit(0);
print("redGain:" + redGain.toString());

redHdrGain = redGain*hdrGain;
greenHdrGain = greenGain*hdrGain;
blueHdrGain = blueGain*hdrGain;

print(" ");
print("Red*HDR gain set to: " + redHdrGain.toString() );
print("Green*HDR gain set to: " + greenHdrGain.toString() );
print("Blue*HDR gain set to: " + blueHdrGain.toString() );

// ********************* file base number setup *********************

print(" ");
print("Base file number =" + (offset*1000).toString() );

// ********************* file name options *********************
// set this string with correct data, added to filename if enabled with "yes"
// set cameradata = "no" or cameradata = "yes"

cameradata="no";

if (cameradata == "yes") {
	camera = "6D";
	telescope = "TS130";
	aperaturevalue = "av7";
	iso = "iso1600";
	date = "201901010";
	extrainfo = "M45";
	
	separator = "_";

	equipment = separator + "_" + camera + separator + "_" + telescope + separator + "_" + aperaturevalue + separator + "_" + iso + separator + "_" + date + separator + "_" + extrainfo;
}
else {
	equipment = ""; // nothing, no extra info in filename
}


// ********************* first part: reading raw files and convert to tiff *******************************

//Get File Directory with raw object images

ij.io.OpenDialog.setDefaultDirectory(rawImagesDirectory);  // Set default Raw files directory

dirSourch = IJ.getDirectory("Select Input object raw files Directory");
print(" ");
print("Reading files from: " + dirSourch);
var dir = new java.io.File(dirSourch); 
var fileList = dir.listFiles(); 
print("Files found: " + fileList.toString());

// work to be done on image, part 1
work1 = "Batch read Canon CR2 raw files with overscan area and convert to CFA tiff bit and save";

print(" ");
print(work1 + " - Starting");
print("Reading raw files from : " + dirSourch);

dirDestCfa = dirSourch + "cfa" + File.separator; // cfa directory, this one can be deletd later
File.makeDirectory(dirDestCfa);
print("Create output cfa directory: " + dirDestCfa);

dirDestRaw = dirSourch + "raw" + File.separator; // raw directory, place your raw files here later
File.makeDirectory(dirDestRaw);
print("Create output raw directory: " + dirDestRaw);

dirDestAligne = dirSourch + "aligne" + File.separator; // aligne directory, place your aligned files here
File.makeDirectory(dirDestAligne);
print("Create output raw directory: " + dirDestAligne);

dirDestStack = dirSourch + "stack" + File.separator; // stack directory, place your stacked files here
File.makeDirectory(dirDestStack);
print("Create output stack directory: " + dirDestStack);

// set to true and it will be fast, set to false and you can see the process in work
setBatchMode(true);

// ********************* open library of rggb masterflat files *********************

call("ij.io.OpenDialog.setDefaultDirectory", masterFlatDirectory);  // Set default MasterFlat directory

if (flatcal == "flat") {
	masterFlatRed = File.openDialog("Select MasterFlat Red file");
	masterFlatGreen1 = File.openDialog("Select MasterFlat Green1 file");
	masterFlatGreen2 = File.openDialog("Select MasterFlat Green2 file");
	masterFlatBlue = File.openDialog("Select MasterFlat Blue file");
}
else {
	print(" ");
	print("Flat calibration disabled !");
}

fileNumber = 0; // all files in directory
extno=0; // number of files with correct file extension

while (fileNumber < fileList.length) {
	id = fileList[fileNumber++];
	extend=lengthOf(id);
	dotIndex = indexOf(id, ".");

	if (dotIndex >= 0) {
		ext = substring(id, extend-4, extend);
		extno=extno+1;
	}
	else {
		ext = "subdirectory";
	}

// process only correct files, if not Canon change to other file extension above, Note: for the moment only Canon works
	if (ext==filetype) {

	readRawFiles(dirSourch,id);

	saveAs("Tiff", dirDestCfa + "cfa_" + toString(offset*1000+extno));
	close();

		print(toString(fileNumber) + "/" + toString(fileList.length) + ": " + id + " saved as: " + "cfa_" + toString(offset*1000+extno) +".tif");
	}
	else
		print(toString(fileNumber) + "/" + toString(fileList.length) + ": " + id + " excluded");
	}

print(work1 + " - Completed");

// END first part, open raw and store as CFA TIFF 16-bit


// ********************* second part: converting cfa tiff to demosaic rggb calibrated object files ***************************


work2 = "Convert virtual stack of cfa images to demosaiced rggb, calibrate dark, bias and flat, save as 32 bit tiff";
print(" ");
print(work2 + " - Starting");
print("open cfa files as virtual stack");

//Get File output directory
rotObject = dirSourch; // use the same directory as sourch

dirDestrggb = dirSourch + "object_rggb" + File.separator;
File.makeDirectory(dirDestrggb);
print("create output rggb object dir: " + dirDestrggb);

if (flatcal == "flat") {

open(masterFlatRed);
masterFlatRedTitle = getTitle();
print("MasterFlat Red: " + masterFlatRedTitle + " is open");

open(masterFlatGreen1);
masterFlatGreen1Title = getTitle();
print("MasterFlat Green1: " + masterFlatGreen1Title + " is open");

open(masterFlatGreen2);
masterFlatGreen2Title = getTitle();
print("MasterFlat Green2: " + masterFlatGreen2Title + " is open");

open(masterFlatBlue);
masterFlatBlueTitle = getTitle();
print("MasterFlat Blue: " + masterFlatBlueTitle + " is open");

}



// open earlier saved tiff files as a virtual stack
IJ.run("Image Sequence...", "open=[" + dirDestCfa + "] number=extno starting=1 increment=1 scale=100 file=[] or=[] sort use");
idSrc = getImageID();
n = nSlices();
print("open cfa as virtual stack");
print(" ");

for (i=1; i<=n; i++) {
	selectImage(idSrc);
	setSlice(i);
	IJ.run("Duplicate...", "title=NoStack");
	oneimage = getImageID();

//	debayer order rg1g2b // Red Green1 Green2 Blue

//      Red channel

	selectImage(oneimage);
	makeColorChannel("Red", 0, 0);
	removeBiasDark(dirDestrggb,"Red_",equipment);

	if (flatcal == "flat") {
	imageCalculator("Divide 32-bit","deMosaic",masterFlatRedTitle); // flat calibration
	}

	IJ.run("Multiply...", "value=redHdrGain");

	if (order == "time") {
		saveAs("Tiff", dirDestrggb + toString(offset*1000+i) + "_Red" + equipment);
	}
	else {
		saveAs("Tiff", dirDestrggb + "Red_" + toString(offset*1000+i) + equipment);
	}
	object = getImageID();
	selectImage(object); close();
	if (isOpen("deMosaic")) {selectImage("deMosaic"); close(); }
	print(toString(i) + "/" + toString(n) + ": " + toString(offset*1000+i) +" Red objectfile finished");

//      Green1 channel

	selectImage(oneimage); 
	makeColorChannel("Green1", -1, 0);
	removeBiasDark(dirDestrggb,"Green1_",equipment);

	if (flatcal == "flat") {
	imageCalculator("Divide 32-bit","deMosaic",masterFlatGreen1Title); // flat calibration
	}

	IJ.run("Multiply...", "value=greenHdrGain");

	if (order == "time") {
		saveAs("Tiff", dirDestrggb + toString(offset*1000+i) + "_Green1" + equipment);
	}
	else {
		saveAs("Tiff", dirDestrggb + "Green1_" + toString(offset*1000+i) + equipment);
	}
	object = getImageID();
	selectImage(object); close();
	if (isOpen("deMosaic")) {selectImage("deMosaic"); close(); }
	print(toString(i) + "/" + toString(n) + ": " + toString(offset*1000+i) +" Green1 objectfile finished");

//      Green2 channel

	selectImage(oneimage);
	makeColorChannel("Green2", 0, -1);
	removeBiasDark(dirDestrggb,"Green2_",equipment);

	if (flatcal == "flat") {
	imageCalculator("Divide 32-bit","deMosaic",masterFlatGreen2Title); // flat calibration
	}

	IJ.run("Multiply...", "value=greenHdrGain");

	if (order == "time") {
		saveAs("Tiff", dirDestrggb + toString(offset*1000+i) + "_Green2" + equipment);
	}
	else {
		saveAs("Tiff", dirDestrggb + "Green2_" + toString(offset*1000+i) + equipment);
	}
	object = getImageID();
	selectImage(object); close();
	if (isOpen("deMosaic")) {selectImage("deMosaic"); close(); }
	print(toString(i) + "/" + toString(n) + ": " + toString(offset*1000+i) +" Green2 objectfile finished");

//      Blue channel

	selectImage(oneimage);
	makeColorChannel("Blue", -1, -1);
	removeBiasDark(dirDestrggb,"Blue_",equipment);

	if (flatcal == "flat") {
	imageCalculator("Divide 32-bit","deMosaic",masterFlatBlueTitle); // flat calibration
	}

	IJ.run("Multiply...", "value=blueHdrGain");

	if (order == "time") {
		saveAs("Tiff", dirDestrggb + toString(offset*1000+i) + "_Blue" + equipment);
	}
	else {
		saveAs("Tiff", dirDestrggb + "Blue_" + toString(offset*1000+i) + equipment);
	}
	object = getImageID();
	selectImage(object); close();
	if (isOpen("deMosaic")) {selectImage("deMosaic"); close(); }
	print(toString(i) + "/" + toString(n) + ": " + toString(offset*1000+i) +" Blue objectfile finished");
	if (isOpen(oneimage)) {selectImage(oneimage); close(); }
}

if (flatcal == "flat") {
	if (isOpen(masterFlatRedTitle)) {selectImage(masterFlatRedTitle); close(); }
	if (isOpen(masterFlatGreen1Title)) {selectImage(masterFlatGreen1Title); close(); }
	if (isOpen(masterFlatGreen2Title)) {selectImage(masterFlatGreen2Title); close(); }
	if (isOpen(masterFlatBlueTitle)) {selectImage(masterFlatBlueTitle); close(); }
}

if (isOpen(idSrc)) {selectImage(idSrc); close(); }
// if (isOpen("cfa")) {selectImage("cfa"); close(); }

setBatchMode(false);

print(" ");
print(work2 + " - Completed");
print("there is no need anymore of the cfa libary, you can erase it");
print("rggb image files saved on: " + dirDestrggb);

call("ij.io.OpenDialog.setDefaultDirectory", rawImagesDirectory); // set to default raw files directory

// END second part demosaic of CFA and flat calibrate and store as TIFF 32-bit



// ***************** functions **************************************************************


// This is the heart of reading raw DSLR files
// I got it from http://ij-plugins.sourceforge.net/plugins/dcraw/
// small modifications by me to handle batch reading
// You must have it downloaded and installed
// [] because of spaces in filename
	function readRawFiles(dir,filename) {
		IJ.run("DCRaw Reader...",
		"open=[" + dir + filename + "] " +
		"use_temporary_directory " +
		"white_balance=[None] " +
		"do_not_automatically_brighten " +
		"output_colorspace=[raw] " +
		"document_mode " +  // black borders (overscan area) or not
		"document_mode_without_scaling " +
		"read_as=[16-bit linear] " +
		"interpolation=[High-speed, low-quality bilinear] " +
//		"half_size " +
		"do_not_rotate " +
//		"show_metadata" +
		"");
	}


// function Reduce size and demosaic stack
	function makeColorChannel(name, dx, dy) {
		halfWidth = getWidth()/2;
		halfHeight = getHeight()/2;
		IJ.run("Duplicate...", "title=&name duplicate");
		IJ.run("Translate...", "x=&dx y=&dy interpolation=None");
		IJ.run("Size...", "width=&halfWidth height=&halfHeight depth=&n interpolation=None");
		rename("deMosaic");
	}


// function removeBiasDark, this function only works for Canon EOS, tested on Canon 350D, 5D and 6D
	function removeBiasDark(dirDest,filename,equipment) {
	selectImage("deMosaic");
	IJ.run("32-bit");
	getSelectionBounds(x, y, width, height) ;
	makeRectangle(3, 20, 20, height-40); // black area (overscan area), works raws Canon EOS 350D, 5D, 6D
	getRawStatistics(pix,mean,min,max,std,hist);
	IJ.run("Select None");
	IJ.run("Subtract...", "value=mean");
	}
