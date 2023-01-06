use std::fs::File;
use std::io::{BufRead, BufReader};
use colored::Colorize;
use crate::ballots::Ballot;


/// The function that reads the ballots from a file and returns a vector of ballots
/// We assume that the data for each new ballot is separated by a new line
/// And that the data for each ballot is separated by a | character
pub(crate) fn read_ballots_from_file(file_path: String) -> Result<Vec<Ballot>, String> {
    let mut ballots = Vec::new();

    // Open the file
    let file = File::open(file_path)
        .map_err(|err| format!("Error opening the file: {}", err))?;
    let reader = BufReader::new(file);

    // Read the ballots from the file
    for (i, line) in reader.lines().enumerate() {
        let line = line
            .map_err(|err| format!("Error reading the line: {}", err))?;

        // If the line is empty, skip it
        if line.trim() == "" {
            continue;
        }

        // Split the line by the | character
        let line_split = line.split("|");

        // Parse the elements of the line and create a ballot
        let ballot = Ballot::from_iter(line_split)
            .map_err(|err| format!("Error parsing the ballot at line {}: {}", i, err))?;

        // Add the ballot to the vector
        ballots.push(ballot);
    }

    println!("{}", format!("\nFinished reading ballots from the file").green());
    Ok(ballots)
}
